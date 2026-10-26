'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import type { SavedNote } from '@/types/note';
import type { SetlistEntry } from './note-navigation';
import { formatPresetLabel } from './preset-send';

/** Elenco alfabetico dei brani della scaletta per sceglierne uno qualsiasi (V11). */
export function SetlistPicker({ open, onOpenChange, entries, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: SetlistEntry[];
  onPick: (note: SavedNote) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Scegli un brano</DialogTitle>
          <DialogDescription>Brani della scaletta in ordine alfabetico. Il numero è la posizione in scaletta.</DialogDescription>
        </DialogHeader>
        <ul className="-mx-1 space-y-1">
          {entries.map(({ note, position, isCurrent }) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => { onPick(note); onOpenChange(false); }}
                aria-current={isCurrent ? 'true' : undefined}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors',
                  isCurrent ? 'border-primary bg-primary/15' : 'border-border bg-card hover:bg-secondary',
                )}
              >
                <span className="w-7 shrink-0 text-right font-bold tabular-nums text-muted-foreground">{position}</span>
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
      </DialogContent>
    </Dialog>
  );
}
