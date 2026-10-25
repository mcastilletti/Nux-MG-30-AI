import type { SavedNote } from '@/types/note';

export interface SetlistPosition {
  /** Posizione 1..total nella scaletta. */
  index: number;
  total: number;
  previous: SavedNote | null;
  next: SavedNote | null;
}

/**
 * Posizione della nota nella sua scaletta (stessa band e scaletta, ordinata per `order`).
 * Null per note nuove o non trovate.
 */
export function getSetlistPosition(notes: SavedNote[], currentNoteId: string | null): SetlistPosition | null {
  if (!currentNoteId || currentNoteId === 'new-block') return null;

  const currentNote = notes.find((note) => note.id === currentNoteId);
  if (!currentNote) return null;

  const notesInSetlist = notes
    .filter((note) => note.band === currentNote.band && note.setlist === currentNote.setlist)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const currentIndex = notesInSetlist.findIndex((note) => note.id === currentNoteId);
  if (currentIndex < 0) return null;

  return {
    index: currentIndex + 1,
    total: notesInSetlist.length,
    previous: notesInSetlist[currentIndex - 1] ?? null,
    next: notesInSetlist[currentIndex + 1] ?? null,
  };
}

export function getNextNoteInSetlist(notes: SavedNote[], currentNoteId: string | null): SavedNote | null {
  return getSetlistPosition(notes, currentNoteId)?.next ?? null;
}

export function getPreviousNoteInSetlist(notes: SavedNote[], currentNoteId: string | null): SavedNote | null {
  return getSetlistPosition(notes, currentNoteId)?.previous ?? null;
}
