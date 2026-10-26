'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { poolNotes } from '@/lib/playlist-view';
import type { SavedNote } from '@/types/note';
import type { Playlist } from '@/types/playlist';

/**
 * "Aggiungi brani" (spec PL3): ricerca e selezione multipla dal serbatoio.
 * I brani già presenti sono spuntati e disattivati; i nuovi vanno in coda.
 */
export function AddSongsDialog({ open, onOpenChange, playlist, notes, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: Playlist | null;
  notes: SavedNote[];
  onAdd: (noteIds: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const present = useMemo(() => new Set(playlist?.items.map((item) => item.noteId) ?? []), [playlist]);
  const list = useMemo(() => poolNotes(notes, { query }), [notes, query]);

  const close = (next: boolean) => {
    if (!next) { setQuery(''); setSelected([]); }
    onOpenChange(next);
  };
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aggiungi brani a «{playlist?.name}»</DialogTitle>
          <DialogDescription>Scegli dal serbatoio: i brani nuovi vanno in fondo alla playlist.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nel serbatoio…" aria-label="Cerca nel serbatoio" className="h-11 pl-9" />
        </div>
        <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2" aria-label="Brani del serbatoio">
          {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nessun brano trovato.</li>}
          {list.map((note) => {
            const already = present.has(note.id);
            const checked = already || selected.includes(note.id);
            return (
              <li key={note.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-disabled={already}
                  disabled={already}
                  onClick={() => toggle(note.id)}
                  className={cn('flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60')}
                >
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground')}>
                    {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <span className={cn('min-w-0 flex-1 truncate font-semibold', note.type === 'block' && 'text-primary')}>{note.title || 'Senza titolo'}</span>
                  {already && <span className="shrink-0 text-caption text-muted-foreground">già presente</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => close(false)}>Annulla</Button>
          <Button className="min-h-11" disabled={selected.length === 0} onClick={() => { onAdd(selected); close(false); }}>
            Aggiungi{selected.length > 0 ? ` ${selected.length}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
