'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import type { SavedNote } from '@/types/note';
import type { BandEntry, SetlistEntry } from './note-navigation';
import { formatPresetLabel } from './preset-send';

/**
 * Scelta libera del brano (V11): prima la scaletta corrente, poi tutti i brani della band
 * (di tutte le sue scalette), entrambi in ordine alfabetico. Il numero è la posizione nella
 * scaletta corrente.
 */
export function SetlistPicker({ open, onOpenChange, entries, bandEntries, setlistName, bandName, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: SetlistEntry[];
  bandEntries?: BandEntry[];
  setlistName?: string;
  bandName?: string;
  onPick: (note: SavedNote) => void;
}) {
  const pick = (note: SavedNote) => { onPick(note); onOpenChange(false); };
  const showBand = !!bandEntries?.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Scegli un brano</DialogTitle>
          <DialogDescription>
            {showBand
              ? 'Prima la scaletta, poi tutti i brani della band, in ordine alfabetico. Il numero è la posizione in scaletta.'
              : 'Brani della scaletta in ordine alfabetico. Il numero è la posizione in scaletta.'}
          </DialogDescription>
        </DialogHeader>
        <PickerSection title={showBand ? `Scaletta${setlistName ? `: ${setlistName}` : ''}` : undefined} entries={entries} onPick={pick} />
        {showBand && (
          <PickerSection title={`Tutti i brani${bandName ? ` di ${bandName}` : ' della band'}`} entries={bandEntries!} onPick={pick} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerSection({ title, entries, onPick }: { title?: string; entries: BandEntry[]; onPick: (note: SavedNote) => void }) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={title ? headingId : undefined} className="space-y-1.5">
      {title && <h3 id={headingId} className="section-kicker px-1 pt-1">{title}</h3>}
      <ul className="-mx-1 space-y-1">
        {entries.map(({ note, position, isCurrent }) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => onPick(note)}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors',
                isCurrent ? 'border-primary bg-primary/15' : 'border-border bg-card hover:bg-secondary',
              )}
            >
              <span className="w-7 shrink-0 text-right font-bold tabular-nums text-muted-foreground">
                {position ?? <span className="sr-only">fuori scaletta</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words font-bold">{note.title || 'Senza titolo'}</span>
                {note.type === 'block' ? (
                  <span className="text-caption text-muted-foreground">Blocco di testo</span>
                ) : note.presetSlot ? (
                  <span className="text-caption font-semibold text-primary">{formatPresetLabel(formatSlotLabel(Number(note.presetSlot)), note.presetScene)}</span>
                ) : null}
              </span>
              {isCurrent && <span className="flex shrink-0 items-center gap-1 text-caption font-bold text-primary"><Check className="h-4 w-4" aria-hidden="true" /> in corso</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
