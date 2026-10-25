'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { getConnectionStatusView, type MidiStatus } from './connection-status-view';

const TONES = {
  success: { dot: 'bg-success', text: 'text-success', border: 'border-success/50' },
  warning: { dot: 'bg-warning animate-pulse', text: 'text-warning', border: 'border-warning/50' },
  muted: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', border: 'border-border' },
  destructive: { dot: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/50' },
} as const;

/** Stato della pedaliera: pallino + testo breve; il dettaglio va in title e aria. */
export function ConnectionStatus({ status, lastError, className }: { status: MidiStatus | string; lastError?: string | null; className?: string }) {
  const view = getConnectionStatusView(status, lastError);
  const tone = TONES[view.tone];
  return (
    <span
      role="status"
      title={view.detail}
      className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-caption font-semibold', tone.border, tone.text, className)}
    >
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', tone.dot)} />
      {view.label}
      <span className="sr-only">. {view.detail}</span>
    </span>
  );
}
