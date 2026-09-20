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
  });
});
