'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cn } from '@/lib/utils';
import { contentPreview, findContentDuplicates, planContentMerge, type ContentMergePlan } from '@/lib/content-duplicates';
import { playlistLabelsFor } from '@/lib/playlist-view';
import { formatSlotLabel } from '@/lib/slot';
import { formatPresetLabel } from '@/components/notes/preset-send';
import type { SavedNote } from '@/types/note';
import type { Band, Playlist } from '@/types/playlist';

/**
 * "Unisci note identiche": note con lo stesso contenuto e titolo diverso.
 * Per ogni gruppo si sceglie la nota da tenere (proposta: senza "ACU" nel
 * titolo); le altre vengono eliminate e nelle playlist le sostituisce la nota
 * tenuta, con il preset che avevano.
 */
export function ContentDuplicatesDialog({ open, onOpenChange, notes, playlists, bands, onBackup, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: SavedNote[];
  playlists: Playlist[];
  bands: Band[];
  onBackup: () => void;
  onApply: (plan: ContentMergePlan) => Promise<void> | void;
}) {
  const groups = useMemo(() => (open ? findContentDuplicates(notes) : []), [open, notes]);
  const [keepFor, setKeepFor] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // A ogni apertura si riparte dalle proposte.
  useEffect(() => {
    if (!open) return;
    setKeepFor(Object.fromEntries(groups.map((g) => [g.key, g.keepId])));
    setSkipped(new Set());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const keep = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups) {
      if (skipped.has(group.key)) continue;
      const keepId = keepFor[group.key] ?? group.keepId;
      for (const note of group.notes) if (note.id !== keepId) map.set(note.id, keepId);
    }
    return map;
  }, [groups, keepFor, skipped]);

  const toggleGroup = (key: string) => setSkipped((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const count = keep.size;

  const apply = async () => {
    setBusy(true);
    try {
      await onApply(planContentMerge(notes, playlists, keep));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const describe = (note: SavedNote) => {
    const labels = playlistLabelsFor(note.id, playlists, bands).map((l) => l.name);
    const preset = note.presetSlot ? formatPresetLabel(formatSlotLabel(Number(note.presetSlot)), note.presetScene) : 'nessun preset';
    return `${preset} · ${labels.length ? labels.join(', ') : 'in nessuna playlist'}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Unisci note identiche</DialogTitle>
            <DialogDescription>
              Note con lo stesso contenuto (accordi e testo) anche se il titolo è diverso. Brani con lo stesso titolo ma accordi diversi restano in gruppi separati. Per ogni gruppo scegli quale tenere: le altre vengono eliminate e nelle playlist le sostituisce quella tenuta, con lo stesso preset.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-2">
            {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nessuna nota con contenuto identico.</p>}
            {groups.map((group, index) => {
              const included = !skipped.has(group.key);
              const keepId = keepFor[group.key] ?? group.keepId;
              return (
                <fieldset key={group.key} className={cn('rounded-xl border border-border p-2', !included && 'opacity-60')} data-duplicate-group={index}>
                  <legend className="sr-only">Gruppo {index + 1}</legend>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={included}
                    onClick={() => toggleGroup(group.key)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm font-bold hover:bg-secondary/50"
                  >
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', included ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground')}>
                      {included && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    Gruppo {index + 1}: unisci {group.notes.length} note
                  </button>
                  <p className="px-2 pb-1 text-caption text-muted-foreground">
                    <span className="font-semibold text-foreground">Contenuto in comune:</span> {contentPreview(group.notes[0])}
                  </p>
                  <div role="radiogroup" aria-label={`Nota da tenere, gruppo ${index + 1}`} className="mt-1 space-y-1">
                    {group.notes.map((note) => {
                      const kept = note.id === keepId;
                      return (
                        <button
                          key={note.id}
                          type="button"
                          role="radio"
                          aria-checked={kept}
                          disabled={!included}
                          onClick={() => setKeepFor((prev) => ({ ...prev, [group.key]: note.id }))}
                          className={cn('flex min-h-12 w-full items-start gap-3 rounded-lg border px-2 py-2 text-left', kept ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-secondary/50')}
                        >
                          <span className={cn('mt-0.5 h-5 w-5 shrink-0 rounded-full border-2', kept ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_hsl(var(--background))]' : 'border-muted-foreground')} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{note.title.trim() || 'Senza titolo'}</span>
                            <span className="block text-caption text-muted-foreground">{describe(note)}</span>
                          </span>
                          <span className={cn('shrink-0 text-caption font-bold uppercase', kept ? 'text-primary' : 'text-destructive')}>
                            {included ? (kept ? 'Tieni' : 'Elimina') : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="min-h-11 gap-2" onClick={onBackup}>
              <Download className="h-4 w-4" aria-hidden="true" /> Esporta backup
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-11 flex-1" disabled={busy} onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button variant="destructive" className="min-h-11 flex-1" disabled={count === 0 || busy} onClick={() => setConfirming(true)}>
                Elimina {count} {count === 1 ? 'nota' : 'note'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Eliminare ${count} ${count === 1 ? 'nota' : 'note'}?`}
        description="Nelle playlist restano le note tenute, nella stessa posizione e con lo stesso preset. L'eliminazione non si può annullare: se non l'hai fatto, esporta prima il backup."
        confirmLabel="Elimina"
        destructive
        onConfirm={() => { setConfirming(false); void apply(); }}
      />
    </>
  );
}
