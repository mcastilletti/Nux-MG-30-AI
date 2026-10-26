import assert from 'node:assert/strict';
import test from 'node:test';

import { insertAt, removeAt, sequentialIndex } from './chord-edit';

test('scelte in sequenza restano in ordine (NT11)', () => {
  let chords = ['Em7'];
  const start = 0;
  ['G', 'Gm'].forEach((chord, n) => { chords = insertAt(chords, sequentialIndex(start, n), chord); });
  assert.deepEqual(chords, ['G', 'Gm', 'Em7']);
  let after = ['C', 'D'];
  ['E', 'F'].forEach((chord, n) => { after = insertAt(after, sequentialIndex(1, n), chord); });
  assert.deepEqual(after, ['C', 'E', 'F', 'D']);
});

test('rimozione e annullamento ripristinano la lista', () => {
  const { list, removed, index } = removeAt(['G', 'NEWLINE', 'C'], 1);
  assert.deepEqual(list, ['G', 'C']);
  assert.equal(removed, 'NEWLINE');
  assert.deepEqual(insertAt(list, index, removed!), ['G', 'NEWLINE', 'C']);
});

test('insertAt limita l\'indice ai bordi', () => {
  assert.deepEqual(insertAt(['A'], 99, 'B'), ['A', 'B']);
  assert.deepEqual(insertAt(['A'], -3, 'B'), ['B', 'A']);
});
