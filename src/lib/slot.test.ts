import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSlotLabel, matchesSlotSearch } from './slot';

test('etichette degli slot', () => {
  assert.equal(formatSlotLabel(1), '01A');
  assert.equal(formatSlotLabel(6), '02B');
  assert.equal(formatSlotLabel(40), '10D');
  assert.equal(formatSlotLabel(128), '32D');
});

test('ricerca per etichetta breve, completa o nome', () => {
  const p = { slot: 6, name: 'Clean ES-335' };
  assert.ok(matchesSlotSearch(p, '2b'));
  assert.ok(matchesSlotSearch(p, '02b'));
  assert.ok(matchesSlotSearch(p, 'es-335'));
  assert.ok(!matchesSlotSearch(p, '3a'));
  // banchi a due cifre: l'etichetta breve è uguale a quella completa
  assert.ok(matchesSlotSearch({ slot: 40, name: 'x' }, '10d'));
});
