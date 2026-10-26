'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { groupPlaylistsByBand } from '@/lib/playlist-view';
import type { SavedNote } from '@/types/note';
import type { Band, Playlist } from '@/types/playlist';

/**
 * "Aggiungi a playlist…" (spec PL6): playlist raggruppate per band, con spunte
 * modificabili. Togliere la spunta toglie il brano da quella playlist.
 */
export function AddToPlaylistsDialog({ note, onOpenChange, playlists, bands, onApply }: {
  note: SavedNote | null;
  onOpenChange: (open: boolean) => void;
  playlists: Playlist[];
  bands: Band[];
  onApply: (note: SavedNote, add: string[], remove: string[]) => void;
}) {
  const initial = useMemo(() => new Set(note ? playlists.filter((p) => p.items.some((i) => i.noteId === note.id)).map((p) => p.id) : []), [note, playlists]);
  const [checked, setChecked] = useState<Set<string>>(initial);
  useEffect(() => { setChecked(new Set(initial)); }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupPlaylistsByBand(playlists, bands), [playlists, bands]);
  const add = [...checked].filter((id) => !initial.has(id));
  const remove = [...initial].filter((id) => !checked.has(id));
  const toggle = (id: string) => setChecked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Playlist di «{note?.title}»</DialogTitle>
          <DialogDescription>Spunta le playlist in cui deve comparire. Il brano resta uno solo: le modifiche valgono ovunque.</DialogDescription>
        </DialogHeader>
        <div className="-mx-2 min-h-0 flex-1 space-y-4 overflow-y-auto px-2">
          {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nessuna playlist: creale dalla pagina Band.</p>}
          {groups.map((group) => (
            <fieldset key={group.band?.id ?? group.bandName}>
              <legend className="mb-1 text-caption font-black uppercase tracking-wider text-muted-foreground">{group.bandName}</legend>
              {group.playlists.map((playlist) => {
                const on = checked.has(playlist.id);
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(playlist.id)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-secondary/50"
                  >
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground')}>
                      {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{playlist.name}</span>
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{playlist.items.length}</span>
                  </button>
                );
              })}
            </fieldset>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button className="min-h-11" disabled={add.length + remove.length === 0} onClick={() => { if (note) onApply(note, add, remove); onOpenChange(false); }}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
