import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { FACTORY_CARDS } from '@/data/factory-cards';
import { songsForFactoryCard, songsWithoutGenre, suggestFactoryPresets } from './factory-suggestions';

const song = (id: string, title: string, genre?: string, extra: Partial<SavedNote> = {}): SavedNote => ({ id, title, band: '', setlist: '', genre, ...extra });

test('consigli per genere: al massimo 3, dalle schede di fabbrica', () => {
  for (const genre of ['Blues', 'Rock', 'Britpop', 'Metal']) {
    const slots = suggestFactoryPresets(genre);
    assert.ok(slots.length > 0 && slots.length <= 3, genre);
    for (const slot of slots) assert.ok(FACTORY_CARDS[slot].genres.includes(genre as never), `${genre} → ${slot}`);
  }
  assert.deepEqual(suggestFactoryPresets(undefined), []);
  assert.deepEqual(suggestFactoryPresets('Vaporwave'), [], 'genere fuori lista');
});

test('per il Britpop i preset segnati come adatti a Oasis/alt rock vengono prima', () => {
  const slots = suggestFactoryPresets('Britpop', 10);
  assert.ok(slots.every((s) => FACTORY_CARDS[s].altRock));
});

test('brani adatti a un preset e brani senza genere', () => {
  const songs = [
    song('a', 'Paranoid', 'Metal'),
    song('b', 'Pride and Joy', 'Blues'),
    song('c', 'Intro', 'Metal', { type: 'block' }),
    song('d', 'Copia', 'Metal', { mergedInto: 'a' }),
    song('e', 'Senza genere'),
    song('f', 'Genere strano', 'Vaporwave'),
  ];
  assert.deepEqual(songsForFactoryCard(FACTORY_CARDS[12], songs).map((s) => s.id), ['a']);
  assert.deepEqual(songsForFactoryCard(undefined, songs), []);
  assert.deepEqual(songsWithoutGenre(songs).map((s) => s.id), ['e', 'f']);
});
