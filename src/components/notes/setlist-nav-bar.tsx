'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Barra Prec · n/N · Succ nella zona del pollice (spec L2, V4).
 * `size="live"` usa comandi alti 64px.
 */
export function SetlistNavBar({ index, total, onPrevious, onNext, size = 'rehearsal', className }: {
  index: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  size?: 'rehearsal' | 'live';
  className?: string;
}) {
  const height = size === 'live' ? 'min-h-16 text-lg' : 'min-h-12 text-sm';
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
      <span className="min-w-14 text-center font-bold tabular-nums text-muted-foreground" aria-live="polite">
        <span className="sr-only">Brano </span>{index} / {total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Apri la nota successiva"
        className={cn('flex items-center justify-center gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-40', height)}
      >
        Succ <ChevronRight aria-hidden="true" className="h-5 w-5" />
      </button>
    </nav>
  );
}
