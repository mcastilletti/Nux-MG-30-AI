'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Testo per le tecnologie assistive quando l'etichetta è solo un numero o un'icona. */
  ariaLabel?: string;
  /** Piccolo LED a sinistra: acceso (verde) o spento. */
  led?: boolean;
}

/**
 * Comando a segmenti (scene, schede). Un solo valore attivo: giallo sul segmento scelto.
 * Ogni segmento è alto almeno 44 px.
 */
export function Segmented<T extends string | number>({ value, onChange, options, ariaLabel, className, fill = false }: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
  /** I segmenti si dividono tutta la larghezza. */
  fill?: boolean;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex gap-1 rounded-xl border border-border bg-card p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors',
              fill && 'flex-1',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {option.led !== undefined && (
              <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', option.led ? 'bg-success' : 'bg-border')} />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
