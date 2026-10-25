import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { getNoteLoadAction } from './note-load-action';

const note: SavedNote = { id: 'song-1', title: 'A', band: 'B', setlist: 'S' };

test('a new note starts an empty draft', () => {
  assert.equal(getNoteLoadAction({ noteId: null, note: undefined, loadedNoteId: 'song-1' }), 'new');
});

test('an existing note is loaded once it is in the cache', () => {
  assert.equal(getNoteLoadAction({ noteId: 'song-1', note, loadedNoteId: null }), 'load');
});

test('a note arriving later from the cache is still loaded', () => {
  assert.equal(getNoteLoadAction({ noteId: 'song-1', note: undefined, loadedNoteId: null }), 'missing');
  assert.equal(getNoteLoadAction({ noteId: 'song-1', note, loadedNoteId: null }), 'load');
});

test('cache updates of the already loaded note do not reload it', () => {
  assert.equal(getNoteLoadAction({ noteId: 'song-1', note, loadedNoteId: 'song-1' }), 'none');
});
