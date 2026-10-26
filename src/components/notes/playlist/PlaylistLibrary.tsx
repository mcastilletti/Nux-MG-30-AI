'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ListPlus, Music2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { cn } from '@/lib/utils';
import { effectivePreset, indexNotes, playlistEntries, type PlaylistEntry } from '@/lib/playlist-ops';
import { chipSummary, matchesQuery, playlistLabelsFor, poolNotes, type PoolTypeFilter } from '@/lib/playlist-view';
import type { SavedNote } from '@/types/note';
import type { Band, Playlist } from '@/types/playlist';
import { AddSongsDialog } from './AddSongsDialog';
import { PlaylistNoteRow } from './PlaylistNoteRow';

export const POOL_VALUE = 'pool';

/**
 * Lista della pagina Note nel modello a playlist (spec PL1–PL3, PL10):
 * filtro band → playlist, vista "Tutti i brani" (serbatoio) e vista playlist
 * con riordino, "Aggiungi brani" e "Avvia live".
 */
export function PlaylistLibrary({
  notes, playlists, bands, bandId, playlistId, onBandChange, onPlaylistChange, searchQuery, highlightedId,
  onOpen, onStartLive, onRemoveFromPlaylist, onAddToPlaylists, onDelete, onReorder, onAddSongs, emptyState,
}: {
  notes: SavedNote[];
  playlists: Playlist[];
  bands: Band[];
  bandId: string | null;
  playlistId: string | null;
  onBandChange: (bandId: string | null) => void;
  onPlaylistChange: (playlistId: string | null) => void;
  searchQuery: string;
  highlightedId?: string | null;
  onOpen: (note: SavedNote, playlistId: string | null) => void;
  onStartLive: (note: SavedNote, playlistId: string) => void;
  onRemoveFromPlaylist: (playlist: Playlist, note: SavedNote) => void;
  onAddToPlaylists: (note: SavedNote) => void;
  onDelete: (note: SavedNote) => void;
  onReorder: (playlist: Playlist, fromIndex: number, toIndex: number) => void;
  onAddSongs: (playlist: Playlist, noteIds: string[]) => void;
  /** Stato vuoto quando il serbatoio non ha brani (caricamento, errore, accesso). */
  emptyState?: React.ReactNode;
}) {
  const [poolType, setPoolType] = useState<PoolTypeFilter>('all');
  const [addSongsOpen, setAddSongsOpen] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const notesById = useMemo(() => indexNotes(notes), [notes]);
  const bandName = useMemo(() => new Map(bands.map((b) => [b.id, b.name])), [bands]);
  const sortedBands = useMemo(() => [...bands].filter((b) => playlists.some((p) => p.bandId === b.id)).sort((a, b) => a.name.localeCompare(b.name, 'it')), [bands, playlists]);
  const visiblePlaylists = useMemo(() => playlists
    .filter((p) => !bandId || p.bandId === bandId)
    .sort((a, b) => (bandName.get(a.bandId) ?? '').localeCompare(bandName.get(b.bandId) ?? '', 'it') || a.name.localeCompare(b.name, 'it')), [playlists, bandId, bandName]);
  const playlist = playlistId ? playlists.find((p) => p.id === playlistId) ?? null : null;

  const allEntries = useMemo(() => (playlist ? playlistEntries(playlist, notesById) : []), [playlist, notesById]);
  const entries = useMemo(() => allEntries.filter((e) => matchesQuery(e.note, searchQuery)), [allEntries, searchQuery]);
  const pool = useMemo(() => (playlist ? [] : poolNotes(notes, { query: searchQuery, type: poolType })), [playlist, notes, searchQuery, poolType]);
  const canReorder = !!playlist && !searchQuery.trim();

  const handleDragEnd = (event: DragEndEvent) => {
    if (!playlist || !canReorder || !event.over || event.active.id === event.over.id) return;
    const find = (id: unknown) => allEntries.find((e) => e.note.id === id);
    const from = find(event.active.id); const to = find(event.over.id);
    if (!from || !to) return;
    onReorder(playlist, playlist.items.indexOf(from.item), playlist.items.indexOf(to.item));
  };

  const rowFor = (note: SavedNote, entry?: PlaylistEntry) => {
    const labels = playlist ? [] : playlistLabelsFor(note.id, playlists, bands);
    const { shown, more } = chipSummary(labels);
    return (
      <PlaylistNoteRow
        key={note.id}
        note={note}
        position={entry?.position}
        preset={effectivePreset(note, entry?.item)}
        chips={shown}
        moreChips={more}
        canReorder={canReorder}
        isHighlighted={note.id === highlightedId}
        onOpen={(n) => onOpen(n, playlist?.id ?? null)}
        onRemoveFromPlaylist={playlist ? (n) => onRemoveFromPlaylist(playlist, n) : undefined}
        onAddToPlaylists={onAddToPlaylists}
        onDelete={onDelete}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card/40 p-3 shadow-sm md:grid-cols-2">
        <Select value={bandId ?? 'all'} onValueChange={(v) => { onBandChange(v === 'all' ? null : v); onPlaylistChange(null); }}>
          <SelectTrigger aria-label="Filtra per band" className="h-11 border-border bg-background/50 text-[14px] font-bold"><SelectValue placeholder="Tutte le band" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le band</SelectItem>
            {sortedBands.map((band) => <SelectItem key={band.id} value={band.id}>{band.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={playlist?.id ?? POOL_VALUE} onValueChange={(v) => onPlaylistChange(v === POOL_VALUE ? null : v)}>
          <SelectTrigger aria-label="Scegli playlist" className="h-11 border-border bg-background/50 text-[14px] font-bold"><SelectValue placeholder="Tutti i brani" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={POOL_VALUE}>Tutti i brani</SelectItem>
            {visiblePlaylists.map((p) => (
              <SelectItem key={p.id} value={p.id}>{bandId ? p.name : `${bandName.get(p.bandId) ?? 'Senza band'} · ${p.name}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {playlist ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {allEntries.length > 0 && (
            <Button className="min-h-12 flex-1 gap-2 text-base font-bold" onClick={() => onStartLive(allEntries[0].note, playlist.id)}>
              <Play className="h-5 w-5" aria-hidden="true" /> Avvia live · {allEntries.length} {allEntries.length === 1 ? 'brano' : 'brani'}
            </Button>
          )}
          <Button variant="outline" className="min-h-12 flex-1 gap-2 font-bold" onClick={() => setAddSongsOpen(true)}>
            <ListPlus className="h-5 w-5" aria-hidden="true" /> Aggiungi brani
          </Button>
        </div>
      ) : (
        <div role="group" aria-label="Mostra" className="flex gap-1 rounded-xl border border-border bg-secondary/30 p-1">
          {([['all', 'Tutti'], ['song', 'Brani'], ['block', 'Blocchi']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={poolType === value}
              onClick={() => setPoolType(value)}
              className={cn('min-h-11 flex-1 rounded-lg text-sm font-bold transition-colors', poolType === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {playlist ? (
        entries.length === 0 ? (
          <EmptyState
            icon={<Music2 className="h-10 w-10" />}
            title={allEntries.length === 0 ? 'Playlist vuota' : 'Nessun brano'}
            description={allEntries.length === 0 ? 'Aggiungi brani dal serbatoio con "Aggiungi brani".' : 'Nessun brano della playlist corrisponde alla ricerca.'}
          />
        ) : (
          <>
            {!canReorder && <p className="px-1 text-xs text-muted-foreground">Chiudi la ricerca per riordinare la playlist.</p>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entries.map((e) => e.note.id)} strategy={verticalListSortingStrategy}>
                <ol className="grid grid-cols-1 gap-2.5" aria-label={`Brani di ${playlist.name}`}>
                  {entries.map((entry) => <li key={entry.note.id}>{rowFor(entry.note, entry)}</li>)}
                </ol>
              </SortableContext>
            </DndContext>
          </>
        )
      ) : pool.length === 0 ? (
        notes.length === 0 && emptyState ? emptyState : (
          <EmptyState
            icon={<Music2 className="h-10 w-10" />}
            title="Nessun brano"
            description={notes.length > 0 ? 'Nessun brano corrisponde ai filtri o alla ricerca.' : 'Aggiungi il primo brano con il pulsante +.'}
          />
        )
      ) : (
        <DndContext sensors={sensors}>
          <SortableContext items={pool.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <ul className="grid grid-cols-1 gap-2.5" aria-label="Tutti i brani">
              {pool.map((note) => <li key={note.id}>{rowFor(note)}</li>)}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddSongsDialog open={addSongsOpen} onOpenChange={setAddSongsOpen} playlist={playlist} notes={notes} onAdd={(ids) => playlist && onAddSongs(playlist, ids)} />
    </div>
  );
}
