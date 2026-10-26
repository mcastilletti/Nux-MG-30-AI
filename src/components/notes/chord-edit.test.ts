import assert from 'node:assert/strict';
import test from 'node:test';

import { appendIndex, insertAt, insertionSlots, removeAt, sequentialIndex } from './chord-edit';

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

test('un punto "+" alla fine di ogni riga, prima del suo a capo', () => {
  const short = (chords: string[]) => insertionSlots(chords).map((s) => `${s.line}@${s.index}`);
  assert.deepEqual(short([]), ['0@0']);
  assert.deepEqual(short(['Em7', 'G']), ['0@2']);
  assert.deepEqual(short(['Em7', 'G', 'NEWLINE', 'D']), ['0@2', '1@4']);
  assert.deepEqual(short(['C', 'NEWLINE']), ['0@1', '1@2']);
  assert.deepEqual(short(['NEWLINE', 'NEWLINE', 'A']), ['0@0', '1@1', '2@3']);
});

test('"+" di fine riga: dopo un "A capo" le scelte vanno sulla riga nuova', () => {
  // Simula il "+" di fine della riga 1 in [Em7, G | D]: le scelte A, A capo, G, C.
  let chords = ['Em7', 'G', 'NEWLINE', 'D'];
  let first: number | null = null;
  ['A', 'NEWLINE', 'B', 'C'].forEach((pick, n) => {
    const slot = insertionSlots(chords)[0].index;
    chords = insertAt(chords, appendIndex(slot, n, first), pick);
    if (first === null && pick === 'NEWLINE') first = n;
  });
  assert.deepEqual(chords, ['Em7', 'G', 'A', 'NEWLINE', 'B', 'C', 'NEWLINE', 'D']);
});
