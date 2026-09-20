import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextNoteInSetlist } from './note-navigation';
import type { SavedNote } from '@/types/note';

const notes: SavedNote[] = [
  { id: 'other-band', title: 'Other', band: 'Band B', setlist: 'Live', order: 2 },
  { id: 'third', title: 'Third', band: 'Band A', setlist: 'Live', order: 30 },
  { id: 'first', title: 'First', band: 'Band A', setlist: 'Live', order: 10 },
  { id: 'other-set', title: 'Other set', band: 'Band A', setlist: 'Acoustic', order: 15 },
  { id: 'second', title: 'Second', band: 'Band A', setlist: 'Live', order: 20 },
];

test('returns the next ordered note only from the current setlist', () => {
  assert.equal(getNextNoteInSetlist(notes, 'first')?.id, 'second');
  assert.equal(getNextNoteInSetlist(notes, 'second')?.id, 'third');
});

test('does not wrap after the final note in a setlist', () => {
  assert.equal(getNextNoteInSetlist(notes, 'third'), null);
});
