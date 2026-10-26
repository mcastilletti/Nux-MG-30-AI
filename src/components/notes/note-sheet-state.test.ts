import assert from 'node:assert/strict';
import test from 'node:test';

import {
  initialNoteSheetState,
  getNoteSheetStateFromSearchParams,
  noteSheetReducer,
  type NoteSheetState,
} from './note-sheet-state';

test('keeps an edited song note open across app, list and realtime updates', () => {
  let state: NoteSheetState = noteSheetReducer(initialNoteSheetState, {
    type: 'open',
    noteId: 'song-42',
    editorKind: 'song',
  });

  // These events model parent renders, refetches and backend listener updates.
  for (let update = 0; update < 5; update += 1) {
    const previousState = state;
    state = noteSheetReducer(state, { type: 'data-updated' });
    assert.strictEqual(state, previousState);
    assert.deepEqual(state, {
      isOpen: true,
      noteId: 'song-42',
      editorKind: 'song',
    live: false,
    });
  }
});

test('autosave assigns a new id without closing or changing the mounted editor', () => {
  const newNoteState = noteSheetReducer(initialNoteSheetState, {
    type: 'open',
    noteId: null,
    editorKind: 'song',
  });

  const savedState = noteSheetReducer(newNoteState, {
    type: 'saved',
    noteId: 'created-song',
    editorKind: 'song',
  });

  assert.deepEqual(savedState, {
    isOpen: true,
    noteId: 'created-song',
    editorKind: 'song',
    live: false,
  });
});

test('only the explicit close action transitions an open note to the list', () => {
  const openState = noteSheetReducer(initialNoteSheetState, {
    type: 'open',
    noteId: 'song-42',
    editorKind: 'song',
  });

  assert.equal(noteSheetReducer(openState, { type: 'data-updated' }).isOpen, true);
  assert.equal(noteSheetReducer(openState, { type: 'close' }).isOpen, false);
});

test('restores an open note after a document reload', () => {
  const restoredState = getNoteSheetStateFromSearchParams(
    new URLSearchParams('openNote=song-42&noteKind=song'),
  );

  assert.deepEqual(restoredState, {
    isOpen: true,
    noteId: 'song-42',
    editorKind: 'song',
    live: false,
  });
});

test('restores a new unsaved note without inventing an id', () => {
  const restoredState = getNoteSheetStateFromSearchParams(
    new URLSearchParams('openNote=&noteKind=song'),
  );

  assert.deepEqual(restoredState, {
    isOpen: true,
    noteId: null,
    editorKind: 'song',
    live: false,
  });
});

test('modalità Live: ingresso, navigazione, uscita e URL', async () => {
  const { NOTE_SHEET_LIVE_PARAM } = await import('./note-sheet-state');
  let state = noteSheetReducer(initialNoteSheetState, { type: 'open', noteId: 'a', editorKind: 'song' });
  assert.equal(state.live, false);
  state = noteSheetReducer(state, { type: 'enter-live' });
  assert.equal(state.live, true);
  // Prec/Succ in Live restano in Live
  state = noteSheetReducer(state, { type: 'open', noteId: 'b', editorKind: 'block' });
  assert.deepEqual(state, { isOpen: true, noteId: 'b', editorKind: 'block', live: true });
  state = noteSheetReducer(state, { type: 'exit-live' });
  assert.equal(state.live, false);
  // avvio diretto in Live dalla lista
  state = noteSheetReducer(initialNoteSheetState, { type: 'open', noteId: 'c', editorKind: 'song', live: true });
  assert.equal(state.live, true);
  assert.equal(noteSheetReducer(state, { type: 'close' }).live, false);
  // nota nuova: mai in Live
  assert.equal(noteSheetReducer(state, { type: 'open', noteId: null, editorKind: 'song' }).live, false);
  assert.equal(noteSheetReducer({ ...initialNoteSheetState, isOpen: true, noteId: null }, { type: 'enter-live' }).live, false);
  const params = new URLSearchParams(`openNote=c&noteKind=song&${NOTE_SHEET_LIVE_PARAM}=1`);
  assert.equal(getNoteSheetStateFromSearchParams(params)?.live, true);
  assert.equal(getNoteSheetStateFromSearchParams(new URLSearchParams('openNote=&noteKind=song&live=1'))?.live, false);
});

test('la playlist di apertura entra nello stato e nell\'URL, e Prec/Succ la conservano solo se ripassata', () => {
  const fromPlaylist = noteSheetReducer(initialNoteSheetState, { type: 'open', noteId: 'a', editorKind: 'song', playlistId: 'live-2026' });
  assert.equal(fromPlaylist.playlistId, 'live-2026');
  const next = noteSheetReducer(fromPlaylist, { type: 'open', noteId: 'b', editorKind: 'song', playlistId: fromPlaylist.playlistId });
  assert.equal(next.playlistId, 'live-2026');
  const fromPool = noteSheetReducer(next, { type: 'open', noteId: 'c', editorKind: 'song' });
  assert.equal('playlistId' in fromPool, false);
  const saved = noteSheetReducer(fromPlaylist, { type: 'saved', noteId: 'a2', editorKind: 'song' });
  assert.equal(saved.playlistId, 'live-2026');
  assert.equal(noteSheetReducer(fromPlaylist, { type: 'enter-live' }).playlistId, 'live-2026');
});

test('playlist ripristinata dall\'URL', () => {
  const params = new URLSearchParams('openNote=a&noteKind=song&live=1&playlist=p1');
  assert.deepEqual(getNoteSheetStateFromSearchParams(params), { isOpen: true, noteId: 'a', editorKind: 'song', live: true, playlistId: 'p1' });
  assert.equal('playlistId' in getNoteSheetStateFromSearchParams(new URLSearchParams('openNote=a&noteKind=song'))!, false);
});
