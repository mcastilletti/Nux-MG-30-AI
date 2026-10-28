import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import type { Playlist } from '@/types/playlist';
import { compareKeepers, contentKey, contentPreview, findContentDuplicates, planContentMerge } from './content-duplicates';

const verse = (chords: string[], text = '') => [{ id: 'x', type: 'Verse', text, chords }];
const n = (id: string, title: string, extra: Partial<SavedNote> = {}): SavedNote => ({ id, title, band: '', setlist: '', sections: verse(['C', 'G']), ...extra });
const pl = (id: string, items: Playlist['items']): Playlist => ({ id, name: id, bandId: 'b', userId: 'u', items });

test('contenuto vuoto non conta: titoli diversi sono brani diversi', () => {
  assert.equal(contentKey(n('1', 'A', { sections: verse([]) })), null);
  assert.equal(contentKey(n('2', 'Blocco', { type: 'block', sections: [] })), null);
  assert.notEqual(contentKey(n('3', 'B', { sections: [], generalNotes: 'Capo 2' })), null);
  // Il titolo e il preset non fanno parte del contenuto.
  assert.equal(contentKey(n('4', 'Hello', { presetSlot: '4' })), contentKey(n('5', 'ACU - Hello')));
});

test('si tiene il titolo senza ACU, poi senza 335, poi il più corto', () => {
  const sort = (titles: string[]) => titles.map((t, i) => n(String(i), t)).sort(compareKeepers).map((x) => x.title);
  assert.deepEqual(sort(['ACU - Hello', 'Hello']), ['Hello', 'ACU - Hello']);
  assert.deepEqual(sort(['Cast No Shadow - 335', '335 - Cast No Shadow', 'Cast No Shadow']), ['Cast No Shadow', '335 - Cast No Shadow', 'Cast No Shadow - 335']);
  assert.deepEqual(sort(['ACU - Talk Tonight 335', '335 - Talk Tonight']), ['335 - Talk Tonight', 'ACU - Talk Tonight 335']);
  // "acu" dentro una parola non conta.
  assert.deepEqual(sort(['Acustica lunga', 'ACU x']), ['Acustica lunga', 'ACU x']);
});

test('gruppi: solo note visibili con lo stesso contenuto', () => {
  const notes = [
    n('h', 'Hello', { presetSlot: '4', presetScene: '1' }), n('ha', 'ACU - Hello'),
    n('w', 'Wonderwall', { sections: verse(['Em7']) }),
    n('e1', 'Vuoto 1', { sections: [] }), n('e2', 'Vuoto 2', { sections: [] }),
    n('old', 'Hello', { mergedInto: 'h' }),
  ];
  const groups = findContentDuplicates(notes);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keepId, 'h');
  assert.deepEqual(groups[0].notes.map((x) => x.id), ['h', 'ha']);
});

test('stesso titolo, accordi diversi: gruppi separati, ognuno con la sua anteprima', () => {
  const t = "Don't Look Back in Anger";
  const notes = [
    n('a1', t, { sections: verse(['C', 'G', 'Am']) }), n('a2', `335 - ${t}`, { sections: verse(['C', 'G', 'Am']) }),
    n('b1', `ACU - ${t}`, { sections: verse(['C', 'G', 'Am', 'E']) }), n('b2', `ACU - ${t} 2`, { sections: verse(['C', 'G', 'Am', 'E']) }),
    n('c', `${t} live`, { sections: verse(['F', 'Fm']) }),
  ];
  const groups = findContentDuplicates(notes);
  assert.deepEqual(groups.map((g) => g.notes.map((x) => x.id)), [['b1', 'b2'], ['a1', 'a2']]);
  assert.deepEqual(groups.map((g) => contentPreview(g.notes[0])), ['Verse: C G Am E', 'Verse: C G Am']);
});

test('anteprima: salta gli a capo, usa il testo se mancano accordi, tronca', () => {
  assert.equal(contentPreview(n('1', 'A', { sections: [{ id: 'x', type: 'Intro', text: '', chords: ['Em7', 'NEWLINE', 'G'] }, { id: 'y', type: 'Verse', text: 'Today is\n gonna be', chords: [] }] })), 'Intro: Em7 G · Verse: Today is gonna be');
  assert.equal(contentPreview(n('2', 'B', { type: 'block', sections: [], blockContent: 'Pausa' })), 'Pausa');
  assert.equal(contentPreview(n('3', 'C', { sections: verse(['C', 'G', 'Am', 'F']) }), 10), 'Verse: C…');
});

test('unione: la nota tenuta prende il posto con il preset di prima', () => {
  const notes = [
    n('h', 'Hello', { presetSlot: '4', presetScene: '1' }), n('ha', 'ACU - Hello'),
    n('r', 'Roll With It', { sections: verse(['A']), presetSlot: '48', presetScene: '1' }), n('ra', 'ACU - Roll With It', { sections: verse(['A']), presetSlot: '48', presetScene: '1' }),
    n('old', 'ACU - Hello', { mergedInto: 'ha' }),
  ];
  const playlists = [
    pl('rock', [{ noteId: 'h' }, { noteId: 'r' }]),
    pl('acu', [{ noteId: 'x' }, { noteId: 'ha' }, { noteId: 'ra' }, { noteId: 'old', presetSlot: '7' }]),
    pl('both', [{ noteId: 'ha', presetSlot: '9' }, { noteId: 'h' }]),
  ];
  const plan = planContentMerge(notes, playlists, new Map([['ha', 'h'], ['ra', 'r']]));
  assert.deepEqual(plan.deleteIds, ['ha', 'ra']);
  assert.deepEqual(plan.retarget, [{ noteId: 'old', mergedInto: 'h' }]);
  assert.deepEqual(plan.playlists.map((p) => p.id), ['acu', 'both']);
  // "ACU - Hello" non aveva preset: nella playlist acustica Hello resta senza preset.
  // "ACU - Roll With It" aveva lo stesso preset di Roll With It: nessun preset proprio.
  // La copia nascosta di ACU - Hello è già rappresentata da Hello: si toglie.
  assert.deepEqual(plan.playlists[0].items, [{ noteId: 'x' }, { noteId: 'h', presetSlot: '' }, { noteId: 'r' }]);
  // Hello era già nella playlist: la copia si toglie e resta la nota tenuta.
  assert.deepEqual(plan.playlists[1].items, [{ noteId: 'h' }]);
});
