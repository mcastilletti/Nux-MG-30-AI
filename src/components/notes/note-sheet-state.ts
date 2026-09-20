export type NoteEditorKind = 'song' | 'block';

export interface NoteSheetState {
  isOpen: boolean;
  noteId: string | null;
  editorKind: NoteEditorKind;
}

export type NoteSheetAction =
  | { type: 'open'; noteId: string | null; editorKind: NoteEditorKind }
  | { type: 'saved'; noteId: string; editorKind: NoteEditorKind }
  | { type: 'close' }
  | { type: 'data-updated' };

export const initialNoteSheetState: NoteSheetState = {
  isOpen: false,
  noteId: null,
  editorKind: 'song',
};

export const NOTE_SHEET_OPEN_PARAM = 'openNote';
export const NOTE_SHEET_KIND_PARAM = 'noteKind';

export function getNoteSheetStateFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): NoteSheetState | null {
  const openNote = searchParams.get(NOTE_SHEET_OPEN_PARAM);
  const editorKind = searchParams.get(NOTE_SHEET_KIND_PARAM);

  if (openNote === null || (editorKind !== 'song' && editorKind !== 'block')) {
    return null;
  }

  return {
    isOpen: true,
    noteId: openNote || null,
    editorKind,
  };
}

/**
 * Keeps navigation state independent from the notes collection.
 *
 * Data refreshes must never decide whether the editor is open (or which editor
 * is mounted). Only an explicit open/close action may make that transition.
 */
export function noteSheetReducer(
  state: NoteSheetState,
  action: NoteSheetAction,
): NoteSheetState {
  switch (action.type) {
    case 'open':
      return {
        isOpen: true,
        noteId: action.noteId,
        editorKind: action.editorKind,
      };
    case 'saved':
      if (!state.isOpen) return state;
      return {
        ...state,
        noteId: action.noteId,
        editorKind: action.editorKind,
      };
    case 'close':
      return { ...state, isOpen: false };
    case 'data-updated':
      return state;
  }
}
