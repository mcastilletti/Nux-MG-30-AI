import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import type { Playlist } from '@/types/playlist';
import {
  addNotes, effectivePreset, getPlaylistAlphabetical, getPlaylistPosition, indexNotes, moveItem, playlistEntries,
  playlistsContaining, removeNote, removeNoteFromAll, replaceNote, resolveNoteId, restoreItem, setItemPreset,
} from './playlist-ops';

const note = (id: string, title: string, extra: Partial<SavedNote> = {}): SavedNote => ({ id, title, band: '', setlist: '', ...extra });
const notes = [note('a', 'Wonderwall', { presetSlot: '6', presetScene: '1' }), note('b', 'Creep'), note('c', 'Angels'), note('d', 'Zombie'), note('old', 'Wonderwall', { mergedInto: 'a' })];
const byId = indexNotes(notes);
const pl = (ids: string[], id = 'p1'): Playlist => ({ id, name: 'Live', bandId: 'b1', userId: 'u', items: ids.map((noteId) => ({ noteId })) });
const ids = (p: Playlist) => p.items.map((i) => i.noteId);

test('addNotes aggiunge in coda e salta i brani già presenti', () => {
  const p = pl(['a', 'b']);
  assert.deepEqual(ids(addNotes(p, ['c', 'a', 'd', 'c'])), ['a', 'b', 'c', 'd']);
  assert.equal(addNotes(p, ['a']), p);
  assert.deepEqual(ids(p), ['a', 'b']);
});

test('removeNote e restoreItem: Annulla rimette il brano nella stessa posizione con il suo preset', () => {
  const p = setItemPreset(pl(['a', 'b', 'c']), 'b', '48', '1');
  const { playlist, removed } = removeNote(p, 'b');
  assert.deepEqual(ids(playlist), ['a', 'c']);
  assert.deepEqual(removed, { item: { noteId: 'b', presetSlot: '48', presetScene: '1' }, index: 1 });
  assert.deepEqual(restoreItem(playlist, removed!.item, removed!.index), p);
  assert.equal(removeNote(p, 'zz').removed, null);
});

test('moveItem riordina e ignora indici non validi', () => {
  assert.deepEqual(ids(moveItem(pl(['a', 'b', 'c', 'd']), 0, 2)), ['b', 'c', 'a', 'd']);
  assert.deepEqual(ids(moveItem(pl(['a', 'b', 'c', 'd']), 3, 0)), ['d', 'a', 'b', 'c']);
  const p = pl(['a', 'b']);
  assert.equal(moveItem(p, 0, 5), p);
});

test('replaceNote mette la versione al posto dell\'originale conservando il preset della playlist', () => {
  const p = setItemPreset(pl(['a', 'b', 'c']), 'b', '48', '1');
  const r = replaceNote(p, 'b', 'v2');
  assert.deepEqual(r.items[1], { noteId: 'v2', presetSlot: '48', presetScene: '1' });
  assert.deepEqual(ids(replaceNote(pl(['a', 'b', 'c']), 'b', 'c')), ['a', 'c']);
});

test('setItemPreset: null torna al predefinito, stringa vuota = nessun preset in questa playlist', () => {
  const p = setItemPreset(pl(['a']), 'a', '48', '2');
  assert.deepEqual(p.items[0], { noteId: 'a', presetSlot: '48', presetScene: '2' });
  assert.deepEqual(setItemPreset(p, 'a', null).items[0], { noteId: 'a' });
  assert.deepEqual(setItemPreset(p, 'a', '', '2').items[0], { noteId: 'a', presetSlot: '' });
});

test('effectivePreset: preset della playlist se impostato, altrimenti quello del brano', () => {
  const a = byId.get('a')!;
  assert.deepEqual(effectivePreset(a, null), { presetSlot: '6', presetScene: '1', source: 'note' });
  assert.deepEqual(effectivePreset(a, { noteId: 'a', presetSlot: '48', presetScene: '' }), { presetSlot: '48', presetScene: '', source: 'playlist' });
  assert.deepEqual(effectivePreset(byId.get('b')!, { noteId: 'b' }), { presetSlot: '', presetScene: '', source: 'note' });
  assert.deepEqual(effectivePreset(note('s', 'Senza slot', { presetScene: '1' })), { presetSlot: '', presetScene: '', source: 'note' });
  // "Nessun preset in questa playlist" vince sul predefinito del brano.
  assert.deepEqual(effectivePreset(a, { noteId: 'a', presetSlot: '' }), { presetSlot: '', presetScene: '', source: 'playlist' });
});

test('eliminazione di un brano condiviso: tolto da tutte le playlist che lo contengono', () => {
  const p1 = pl(['a', 'b'], 'p1'); const p2 = pl(['b', 'c'], 'p2'); const p3 = pl(['c'], 'p3');
  assert.deepEqual(playlistsContaining([p1, p2, p3], 'b').map((p) => p.id), ['p1', 'p2']);
  const changed = removeNoteFromAll([p1, p2, p3], 'b');
  assert.deepEqual(changed.map((p) => [p.id, ids(p)]), [['p1', ['a']], ['p2', ['c']]]);
});

test('i duplicati uniti si risolvono nella nota rimasta, senza ripetizioni', () => {
  assert.equal(resolveNoteId('old', byId), 'a');
  assert.equal(resolveNoteId('missing', byId), null);
  const entries = playlistEntries(pl(['old', 'b', 'a', 'missing', 'c']), byId);
  assert.deepEqual(entries.map((e) => [e.note.id, e.position]), [['a', 1], ['b', 2], ['c', 3]]);
});

test('posizione e Prec/Succ seguono la playlist da cui si è aperto il brano', () => {
  const live = pl(['a', 'b', 'c'], 'live'); const prove = pl(['c', 'a'], 'prove');
  assert.deepEqual(getPlaylistPosition(live, byId, 'a'), { index: 1, total: 3, previous: null, next: byId.get('b') });
  assert.deepEqual(getPlaylistPosition(prove, byId, 'a'), { index: 2, total: 2, previous: byId.get('c'), next: null });
  assert.equal(getPlaylistPosition(live, byId, 'd'), null);
  assert.equal(getPlaylistPosition(null, byId, 'a'), null);
});

test('scelta libera (V11): ordine alfabetico con la posizione reale', () => {
  const list = getPlaylistAlphabetical(pl(['a', 'b', 'c']), byId, 'b');
  assert.deepEqual(list.map((e) => [e.note.title, e.position, e.isCurrent]), [['Angels', 3, false], ['Creep', 2, true], ['Wonderwall', 1, false]]);
});
