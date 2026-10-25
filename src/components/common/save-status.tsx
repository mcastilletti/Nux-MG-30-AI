'use client';

import * as React from 'react';

import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSaveStatusLabel, type SaveState } from './save-status-label';

/** Indicatore compatto accanto al pulsante Salva. Annunciato ai lettori di schermo. */
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  const label = getSaveStatusLabel(state);
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1 text-caption font-semibold', state === 'error' ? 'text-destructive' : state === 'saved' ? 'text-success' : 'text-muted-foreground', className)}>
      {label && (
        <>
          {state === 'saving' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
          {state === 'saved' && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
          {state === 'error' && <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />}
          {label}
        </>
      )}
    </span>
  );
}
