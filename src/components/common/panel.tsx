import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Superficie unica dell'app: sostituisce le card sciolte (`app-surface`, `div` con bordo e sfondo propri).
 * - `default`: pannello a livello di superficie;
 * - `inset`: incassato, più scuro del fondo (fascia della catena, riquadro delle immagini dei dispositivi);
 * - `selected`: bordo giallo, per l'elemento attivo di un elenco.
 */
const VARIANT = {
  default: 'border-border bg-card',
  inset: 'border-border/60 bg-inset',
  selected: 'border-primary bg-card',
} as const;

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANT;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(({ variant = 'default', className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border', VARIANT[variant], className)} {...props} />
));
Panel.displayName = 'Panel';
