import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import type { Band, Playlist } from '@/types/playlist';
import { bandNoteIds, buildVersionNote, chipSummary, groupPlaylistsByBand, nextVersionTitle, playlistLabelsFor, poolNotes } from './playlist-view';

const n = (id: string, title: string, extra: Partial<SavedNote> = {}): SavedNote => ({ id, title, band: '', setlist: '', ...extra });
const bands: Band[] = [{ id: 'r', name: "ROCKIN' STARS", userId: 'u' }, { id: 'e', name: 'EMERALD', userId: 'u' }];
const pl = (id: string, name: string, bandId: string, ids: string[]): Playlist => ({ id, name, bandId, userId: 'u', items: ids.map((noteId) => ({ noteId })) });

test('serbatoio: alfabetico, senza i duplicati uniti, con ricerca (anche senza accenti) e filtro per tipo', () => {
  const notes = [n('1', 'Wonderwall'), n('2', 'Città', {}), n('3', 'angels'), n('4', 'Pausa', { type: 'block' }), n('5', 'Wonderwall', { mergedInto: '1' })];
  assert.deepEqual(poolNotes(notes).map((x) => x.id), ['3', '2', '4', '1']);
  assert.deepEqual(poolNotes(notes, { query: 'citta' }).map((x) => x.id), ['2']);
  assert.deepEqual(poolNotes(notes, { type: 'block' }).map((x) => x.id), ['4']);
  assert.deepEqual(poolNotes(notes, { type: 'song', query: 'W' }).map((x) => x.id), ['1']);
});

test('chip delle playlist di un brano, ordinati per band e nome, con "+N"', () => {
  const playlists = [pl('a', 'Rockin 2026', 'r', ['x']), pl('b', 'Completa', 'e', ['x', 'y']), pl('c', 'Acu', 'r', ['x']), pl('d', 'Prove', 'r', ['y'])];
  const labels = playlistLabelsFor('x', playlists, bands);
  assert.deepEqual(labels.map((l) => `${l.bandName}/${l.name}`), ['EMERALD/Completa', "ROCKIN' STARS/Acu", "ROCKIN' STARS/Rockin 2026"]);
  assert.deepEqual(chipSummary(labels).more, 1);
  assert.deepEqual(chipSummary(labels).shown.map((l) => l.id), ['b', 'c']);
});

test('playlist raggruppate per band, band senza playlist escluse', () => {
  const groups = groupPlaylistsByBand([pl('a', 'Z', 'r', []), pl('b', 'A', 'r', []), pl('c', 'X', 'ghost', [])], bands);
  assert.deepEqual(groups.map((g) => [g.bandName, g.playlists.map((p) => p.name)]), [["ROCKIN' STARS", ['A', 'Z']], ['Senza band', ['X']]]);
});

test('titolo della versione senza doppioni', () => {
  assert.equal(nextVersionTitle('Hello', ['Hello']), 'Hello (versione 2)');
  assert.equal(nextVersionTitle('Hello', ['Hello', 'hello (versione 2)']), 'Hello (versione 3)');
  assert.equal(nextVersionTitle('Hello (versione 2)', ['Hello (versione 2)']), 'Hello (versione 3)');
});

test('la versione copia contenuto e preset, non id, unione o playlist', () => {
  const original = n('o', 'Hello', { presetSlot: '4', presetScene: '1', generalNotes: 'Capo 2', sections: [{ id: 's', type: 'Verse', chords: ['Am'], text: '' }], mergedInto: 'z', order: 3, band: 'R', setlist: 'L' });
  const v = buildVersionNote(original, 'Hello (versione 2)');
  assert.equal('id' in v, false);
  assert.equal('mergedInto' in v, false);
  assert.equal(v.band, '');
  assert.equal(v.presetSlot, '4');
  assert.equal(v.generalNotes, 'Capo 2');
  assert.deepEqual(v.sections![0].chords, ['Am']);
  assert.notEqual(v.sections![0].chords, original.sections![0].chords);
});

test('filtro band su "Tutti i brani": solo i brani delle sue playlist, anche se uniti', () => {
  const notes = [n('1', 'Wonderwall'), n('2', 'Creep'), n('3', 'Angels'), n('4', 'Pausa', { type: 'block' }), n('5', 'Wonderwall', { mergedInto: '1' })];
  const playlists = [pl('a', 'Live', 'r', ['2', '5', 'manca']), pl('b', 'Prove', 'r', ['4']), pl('c', 'Estate', 'e', ['3'])];
  const ids = bandNoteIds(notes, playlists, 'r');
  assert.deepEqual([...ids].sort(), ['1', '2', '4']);
  assert.deepEqual(poolNotes(notes, { onlyIds: ids }).map((x) => x.id), ['2', '4', '1']);
  assert.deepEqual(poolNotes(notes, { onlyIds: ids, type: 'song' }).map((x) => x.id), ['2', '1']);
  assert.deepEqual(poolNotes(notes, { onlyIds: bandNoteIds(notes, playlists, 'x') }), []);
});
