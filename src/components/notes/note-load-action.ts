import type { SavedNote } from '@/types/note';

export type NoteLoadAction = 'new' | 'load' | 'missing' | 'none';

/**
 * Decide cosa fare quando cambiano la nota richiesta o la cache.
 * Una nota viene caricata una sola volta per id: gli aggiornamenti successivi
 * della cache (es. dopo un salvataggio) non devono resettare l'editor.
 */
export function getNoteLoadAction({ noteId, note, loadedNoteId }: {
  noteId: string | null;
  note: SavedNote | undefined;
  loadedNoteId: string | null;
}): NoteLoadAction {
  if (!noteId) return 'new';
  if (!note) return 'missing';
  return loadedNoteId === noteId ? 'none' : 'load';
}
