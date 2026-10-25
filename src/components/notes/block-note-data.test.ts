import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { buildBlockNoteData } from './block-note-data';

const notes: SavedNote[] = [
  { id: 'song-1', title: 'A', band: 'Demo Band', setlist: 'Live 2026', order: 0 },
  { id: 'block-1', title: 'Pausa', band: 'Demo Band', setlist: 'Live 2026', order: 3, type: 'block', blockContent: 'old' },
  { id: 'song-2', title: 'B', band: 'Demo Band', setlist: 'Live 2026', order: 5 },
];

test('editing an existing block keeps its band, setlist and order', () => {
  const data = buildBlockNoteData({
    title: 'Pausa lunga',
    blockContent: 'new',
    existing: notes[1],
    initialBand: null,
    initialSetlist: null,
    notes,
  });

  assert.deepEqual(data, {
    title: 'Pausa lunga',
    band: 'Demo Band',
    setlist: 'Live 2026',
    type: 'block',
    blockContent: 'new',
    order: 3,
  });
});

test('a new block goes to the end of the band and setlist it was created in', () => {
  const data = buildBlockNoteData({
    title: 'Nuovo',
    blockContent: '',
    existing: undefined,
    initialBand: 'Demo Band',
    initialSetlist: 'Live 2026',
    notes,
  });

  assert.equal(data.band, 'Demo Band');
  assert.equal(data.setlist, 'Live 2026');
  assert.equal(data.order, 6);
});

test('a new block without filters goes to the default band and setlist', () => {
  const data = buildBlockNoteData({
    title: 'Nuovo',
    blockContent: '',
    existing: undefined,
    initialBand: null,
    initialSetlist: null,
    notes,
  });

  assert.equal(data.band, 'Senza Band');
  assert.equal(data.setlist, 'Senza Scaletta');
  assert.equal(data.order, 0);
});
