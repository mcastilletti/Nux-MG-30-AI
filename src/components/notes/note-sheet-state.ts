export type NoteEditorKind = 'song' | 'block';

export interface NoteSheetState {
  isOpen: boolean;
  noteId: string | null;
  editorKind: NoteEditorKind;
  /** Modalità Live (spec V1–V11): sola lettura a schermo pieno. */
  live: boolean;
}

export type NoteSheetAction =
  /** `live` omesso: in un foglio già aperto resta com'è (Prec/Succ in Live restano in Live). */
  | { type: 'open'; noteId: string | null; editorKind: NoteEditorKind; live?: boolean }
  | { type: 'enter-live' }
  | { type: 'exit-live' }
  | { type: 'saved'; noteId: string; editorKind: NoteEditorKind }
  | { type: 'close' }
  | { type: 'data-updated' };

export const initialNoteSheetState: NoteSheetState = {
  isOpen: false,
  noteId: null,
  editorKind: 'song',
  live: false,
};

export const NOTE_SHEET_OPEN_PARAM = 'openNote';
export const NOTE_SHEET_KIND_PARAM = 'noteKind';
export const NOTE_SHEET_LIVE_PARAM = 'live';

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
    // La Live è solo lettura: richiede una nota esistente.
    live: searchParams.get(NOTE_SHEET_LIVE_PARAM) === '1' && !!openNote,
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
        live: action.noteId ? (action.live ?? (state.isOpen ? state.live : false)) : false,
      };
    case 'enter-live':
      return state.isOpen && state.noteId ? { ...state, live: true } : state;
    case 'exit-live':
      return state.live ? { ...state, live: false } : state;
    case 'saved':
      if (!state.isOpen) return state;
      return {
        ...state,
        noteId: action.noteId,
        editorKind: action.editorKind,
      };
    case 'close':
      return { ...state, isOpen: false, live: false };
    case 'data-updated':
      return state;
  }
}
