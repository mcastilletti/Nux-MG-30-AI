import * as React from 'react';
import { SHAPES, DEVICE_LABEL } from './shapes';
import type { DeviceKind } from './types';

export { DEVICE_KINDS } from './types';
export type { DeviceKind, DeviceArtSpec } from './types';
export { DEVICE_LABEL };

/**
 * Immagine di un dispositivo. `color` è il colore di categoria (CSS); con `on` falso il corpo diventa
 * neutro e il LED si spegne. Vettoriale: `size` è l'altezza in px, la larghezza segue (54×70).
 * Decorativa per default (`aria-hidden`): passare `label` solo se l'immagine è l'unica descrizione.
 */
export function DeviceArt({ kind, color, on = true, knobs, model, size = 64, label, className }: {
  kind: DeviceKind;
  color: string;
  on?: boolean;
  knobs?: number;
  model?: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  const Shape = SHAPES[kind];
  const body = on ? color : 'hsl(var(--block-off))';
  const led = on ? 'hsl(var(--success))' : '#1d1a17';
  return (
    <svg
      viewBox="0 0 54 70"
      height={size}
      width={(size * 54) / 70}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g style={on ? undefined : { filter: 'grayscale(1)', opacity: 0.6 }}>
        <Shape color={body} led={led} knobs={knobs} model={model} />
      </g>
    </svg>
  );
}
