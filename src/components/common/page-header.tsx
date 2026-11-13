import * as React from 'react';
import { cn } from '@/lib/utils';

/** Titolo di pagina unico: sopratitolo, titolo e sottotitolo facoltativi, azioni a destra da `md`. */
export function PageHeader({ kicker, title, description, actions, className }: {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {kicker && <p className="section-kicker mb-1">{kicker}</p>}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
