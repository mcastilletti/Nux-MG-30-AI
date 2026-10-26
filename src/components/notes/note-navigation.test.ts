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

test('posizione, precedente e successivo nella scaletta', async () => {
  const { getSetlistPosition, getPreviousNoteInSetlist } = await import('./note-navigation');
  const pos = getSetlistPosition(notes, 'second');
  assert.deepEqual({ index: pos?.index, total: pos?.total, prev: pos?.previous?.id, next: pos?.next?.id }, { index: 2, total: 3, prev: 'first', next: 'third' });
  assert.equal(getPreviousNoteInSetlist(notes, 'first'), null);
  assert.equal(getPreviousNoteInSetlist(notes, 'third')?.id, 'second');
  assert.equal(getSetlistPosition(notes, 'other-set')?.total, 1);
  assert.equal(getSetlistPosition(notes, 'new-block'), null);
  assert.equal(getSetlistPosition(notes, 'missing'), null);
});

test('elenco alfabetico della scaletta con posizione reale (V11)', async () => {
  const { getSetlistAlphabetical } = await import('./note-navigation');
  const set: SavedNote[] = [
    { id: 'w', title: 'wonderwall', band: 'A', setlist: 'L', order: 0 },
    { id: 'c', title: 'Creep', band: 'A', setlist: 'L', order: 1 },
    { id: 'a10', title: 'Song 10', band: 'A', setlist: 'L', order: 2 },
    { id: 'a2', title: 'Song 2', band: 'A', setlist: 'L', order: 3 },
    { id: 'x', title: 'Altro', band: 'B', setlist: 'L', order: 0 },
  ];
  const list = getSetlistAlphabetical(set, 'c');
  assert.deepEqual(list.map((e) => e.note.id), ['c', 'a2', 'a10', 'w']);
  assert.deepEqual(list.map((e) => e.position), [2, 4, 3, 1]);
  assert.equal(list.find((e) => e.isCurrent)?.note.id, 'c');
  assert.deepEqual(getSetlistAlphabetical(set, 'missing'), []);
});
