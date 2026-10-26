'use client';

import * as React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Stato vuoto: icona, titolo, spiegazione e azione facoltativa. */
export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center', className)}>
      {icon && <div aria-hidden="true" className="text-muted-foreground">{icon}</div>}
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Stato di errore con pulsante "Riprova". */
export function ErrorState({ title = 'Qualcosa non ha funzionato', description, onRetry, className }: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={cn('border-destructive/40', className)}
      icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
      title={title}
      description={description}
      action={onRetry && (
        <Button variant="outline" className="min-h-11 gap-2" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> Riprova
        </Button>
      )}
    />
  );
}
