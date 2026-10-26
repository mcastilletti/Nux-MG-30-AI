'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedNote } from '@/types/note';
import type { SetlistEntry } from './note-navigation';
import { SetlistPicker } from './setlist-picker';

/**
 * Barra Prec · n/N · Succ nella zona del pollice (spec L2, V4).
 * La posizione apre l'elenco alfabetico della scaletta (V11).
 * `size="live"` usa comandi alti 64px.
 */
export function SetlistNavBar({ index, total, onPrevious, onNext, entries, onPick, size = 'rehearsal', className }: {
  index: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  entries?: SetlistEntry[];
  onPick?: (note: SavedNote) => void;
  size?: 'rehearsal' | 'live';
  className?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const height = size === 'live' ? 'min-h-16 text-lg' : 'min-h-12 text-sm';
  const canPick = !!onPick && !!entries?.length;
  return (
    <nav aria-label="Brani della scaletta" className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border bg-card px-3 pt-2.5 pb-3', className)}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={!onPrevious}
        aria-label="Apri la nota precedente"
        className={cn('flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary font-semibold transition-colors hover:bg-secondary/80 disabled:opacity-40', height)}
      >
        <ChevronLeft aria-hidden="true" className="h-5 w-5" /> Prec
      </button>
      {canPick ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`Brano ${index} di ${total}: scegli un altro brano della scaletta`}
          className={cn('flex min-w-16 flex-col items-center justify-center rounded-xl border border-border px-2 font-bold tabular-nums text-muted-foreground hover:border-primary/50 hover:text-foreground', height)}
        >
          <ListMusic aria-hidden="true" className="h-4 w-4" />
          <span className="text-sm">{index} / {total}</span>
        </button>
      ) : (
        <span className="min-w-14 text-center font-bold tabular-nums text-muted-foreground" aria-live="polite">
          <span className="sr-only">Brano </span>{index} / {total}
        </span>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Apri la nota successiva"
        className={cn('flex items-center justify-center gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-40', height)}
      >
        Succ <ChevronRight aria-hidden="true" className="h-5 w-5" />
      </button>
      {canPick && <SetlistPicker open={pickerOpen} onOpenChange={setPickerOpen} entries={entries!} onPick={onPick!} />}
    </nav>
  );
}
