'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, Factory, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/library', label: 'Slot', icon: ListMusic },
  { href: '/library/archive', label: 'Archivio', icon: Archive },
  { href: '/library/factory', label: 'Fabbrica', icon: Factory },
] as const;

/** Sezioni della libreria: slot della pedaliera, Archivio suoni, preset di fabbrica. */
export function LibraryTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni della libreria" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary/30 p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors',
              active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
