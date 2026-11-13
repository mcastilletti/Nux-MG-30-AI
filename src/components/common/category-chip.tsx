import * as React from 'react';
import { cn } from '@/lib/utils';
import type { EffectType } from '@/types/preset';

/** Nome breve della categoria, uguale sulla catena, nelle etichette e nei chip. */
export const CATEGORY_SHORT: Record<EffectType, string> = {
  wah: 'WAH',
  compressor: 'CMP',
  'noise-gate': 'GATE',
  efx: 'DRV',
  amp: 'AMP',
  ir: 'CAB',
  eq: 'EQ',
  modulation: 'MOD',
  delay: 'DLY',
  reverb: 'RVB',
  vol: 'VOL',
  sr: 'S/R',
};

/** Colore di categoria come valore CSS (token `--block-*`, definiti in globals.css). */
export const categoryColor = (type: EffectType) => `hsl(var(--block-${type}))`;

/**
 * Etichetta con il colore della categoria: puntino + testo, senza riempimenti che
 * abbasserebbero il contrasto del testo.
 */
export function CategoryChip({ type, children, className }: { type: EffectType; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-caption font-semibold text-foreground', className)}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: categoryColor(type) }} />
      {children ?? CATEGORY_SHORT[type]}
    </span>
  );
}
