import type { SavedNote } from '@/types/note';

export function getNextNoteInSetlist(
  notes: SavedNote[],
  currentNoteId: string | null,
): SavedNote | null {
  if (!currentNoteId || currentNoteId === 'new-block') return null;

  const currentNote = notes.find((note) => note.id === currentNoteId);
  if (!currentNote) return null;

  const notesInSetlist = notes
    .filter((note) => note.band === currentNote.band && note.setlist === currentNote.setlist)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const currentIndex = notesInSetlist.findIndex((note) => note.id === currentNoteId);

  return currentIndex >= 0 ? notesInSetlist[currentIndex + 1] ?? null : null;
}
