import assert from 'node:assert/strict';
import test from 'node:test';

import type { FactoryPresetNote } from './factory-notes';
import type { Genre } from './genres';
import type { SavedNote } from '@/types/note';
import { songsForFactoryNote, songsWithoutGenre, suggestFactoryPresets } from './factory-suggestions';

const note = (slot: number, genres: Genre[]): FactoryPresetNote => ({ id: `slot_${slot}`, slot, soundType: 'Drive', genres, notes: '', updatedAt: '' });
const song = (id: string, title: string, genre?: string, extra: Partial<SavedNote> = {}): SavedNote => ({ id, title, band: '', setlist: '', genre, ...extra });

test('i primi 3 per genere: prima chi ha il genere più in alto, poi per slot', () => {
  const notes = [note(9, ['Rock', 'Blues']), note(2, ['Blues']), note(5, ['Blues', 'Rock']), note(7, ['Blues']), note(1, ['Metal'])];
  assert.deepEqual(suggestFactoryPresets('Blues', notes), [2, 5, 7]);
  assert.deepEqual(suggestFactoryPresets('Rock', notes), [9, 5], 'meno di 3: tutti quelli che ci sono');
  assert.deepEqual(suggestFactoryPresets('Metal', notes), [1]);
  assert.deepEqual(suggestFactoryPresets('Jazz', notes), []);
  assert.deepEqual(suggestFactoryPresets(undefined, notes), []);
  assert.deepEqual(suggestFactoryPresets('Vaporwave', notes), [], 'genere fuori lista');
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
  assert.deepEqual(songsForFactoryNote(note(1, ['Metal', 'Hard rock']), songs).map((s) => s.id), ['a']);
  assert.deepEqual(songsForFactoryNote(undefined, songs), []);
  assert.deepEqual(songsWithoutGenre(songs).map((s) => s.id), ['e', 'f']);
});
