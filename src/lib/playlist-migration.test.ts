import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { contentFingerprint, planPlaylistMigration } from './playlist-migration';
import { effectivePreset, indexNotes, playlistEntries } from './playlist-ops';

const sec = (type: string, chords: string[], text = '', id = Math.random().toString()) => ({ id, type, chords, text });
const n = (id: string, title: string, band: string, setlist: string, order: number, extra: Partial<SavedNote> = {}): SavedNote =>
  ({ id, title, band, setlist, order, sections: [sec('Verse', ['G'])], updatedAt: '2026-01-01T00:00:00.000Z', ...extra });

const pl = (plan: ReturnType<typeof planPlaylistMigration>, name: string) => plan.playlists.find((p) => p.name === name)!;
const noteIds = (plan: ReturnType<typeof planPlaylistMigration>, name: string) => pl(plan, name).items.map((i) => i.noteId);

test('ogni coppia band/scaletta diventa una playlist con l\'ordine attuale', () => {
  const plan = planPlaylistMigration({
    notes: [n('c', 'Creep', 'Demo', 'Live', 2), n('a', 'Angels', 'Demo', 'Live', 0), n('p', 'Pausa', 'Demo', 'Live', 1, { type: 'block', blockContent: 'Drop D', sections: [] }), n('z', 'Zombie', 'Demo', 'Prove', 0)],
    bands: [], setlists: [],
  });
  assert.deepEqual(noteIds(plan, 'Live'), ['a', 'p', 'c']);
  assert.deepEqual(noteIds(plan, 'Prove'), ['z']);
  assert.deepEqual(plan.bands.map((b) => [b.name, b.existingId]), [['Demo', undefined]]);
  assert.equal(plan.summary.playlistsCreated, 2);
  assert.equal(plan.merges.length, 0);
});

test('a parità d\'ordine decide il titolo', () => {
  const plan = planPlaylistMigration({ notes: [n('b', 'Beta', 'D', 'L', 0), n('a', 'Alfa', 'D', 'L', 0)], bands: [], setlists: [] });
  assert.deepEqual(noteIds(plan, 'L'), ['a', 'b']);
});

test('nomi con spazi superflui e maiuscole diverse coincidono con band e scalette esistenti (P5)', () => {
  const plan = planPlaylistMigration({
    notes: [n('a', 'A', 'EMERALD ', 'Completa ', 0), n('b', 'B', 'emerald', 'completa', 1)],
    bands: [{ id: 'band1', name: 'EMERALD' }],
    setlists: [{ id: 'set1', name: 'Completa', bandId: 'band1' }],
  });
  assert.equal(plan.playlists.length, 1);
  assert.deepEqual(pl(plan, 'Completa').existingId, 'set1');
  assert.deepEqual(noteIds(plan, 'Completa'), ['a', 'b']);
  assert.equal(plan.summary.bandsCreated, 0);
});

test('"Senza Scaletta" non diventa una playlist; "Senza Band" con scaletta va nella band "Senza band"', () => {
  const plan = planPlaylistMigration({
    notes: [n('a', 'A', 'Oasis', 'Senza Scaletta', 0), n('b', 'B', 'Demo', '', 0), n('c', 'C', 'Senza Band', 'Prove', 0)],
    bands: [], setlists: [],
  });
  assert.deepEqual(plan.playlists.map((p) => p.name), ['Prove']);
  assert.deepEqual(plan.bands.map((b) => b.name), ['Senza band']);
  assert.equal(plan.summary.unassigned, 2);
  assert.equal(plan.summary.pool, 3);
});

test('le scalette della pagina Band ancora vuote restano come playlist vuote', () => {
  const plan = planPlaylistMigration({ notes: [], bands: [{ id: 'b1', name: 'Demo' }], setlists: [{ id: 's1', name: 'Estate', bandId: 'b1' }] });
  assert.deepEqual(plan.playlists.map((p) => [p.name, p.existingId, p.items.length]), [['Estate', 's1', 0]]);
});

test('duplicati identici: resta il più recente, l\'altro riceve mergedInto, entrambe le playlist puntano al rimasto', () => {
  const older = n('old', 'Live Forever ', 'R', 'Acustico', 0, { sections: [sec('Verse', ['G', 'D'], 'x', 'id1')], updatedAt: '2026-04-08T00:00:00.000Z' });
  const newer = n('new', 'live forever', 'R', 'Letture', 3, { sections: [sec('Verse', ['G', 'D'], 'x', 'id2')], updatedAt: '2026-07-19T00:00:00.000Z' });
  const plan = planPlaylistMigration({ notes: [older, newer], bands: [], setlists: [] });
  assert.deepEqual(plan.merges, [{ noteId: 'old', mergedInto: 'new' }]);
  assert.deepEqual(noteIds(plan, 'Acustico'), ['new']);
  assert.deepEqual(noteIds(plan, 'Letture'), ['new']);
  assert.equal(plan.summary.pool, 1);
});

test('contenuto diverso: restano due brani (versioni)', () => {
  const a = n('a', 'Hello', 'R', 'L1', 0, { sections: [sec('Verse', ['Am'])] });
  const b = n('b', 'Hello', 'R', 'L2', 0, { sections: [sec('Verse', ['Am', 'F'])] });
  const c = n('c', 'ACU - Hello', 'R', 'L3', 0, { sections: [sec('Verse', ['Am'])] });
  const d = n('d', 'Hello', 'R', 'L4', 0, { sections: [sec('Verse', ['Am'])], generalNotes: 'Capo 2' });
  assert.equal(planPlaylistMigration({ notes: [a, b, c, d], bands: [], setlists: [] }).merges.length, 0);
});

test('l\'impronta ignora id delle sezioni, spazi finali e a capo Windows, ma non il testo', () => {
  const base = n('a', 'T', 'B', 'S', 0, { sections: [sec('Verse', ['G'], 'riff ', 'x')], generalNotes: 'Capo 2\r\nRiff' });
  const same = n('b', ' t ', 'B', 'S', 0, { sections: [sec('Verse', ['G'], 'riff', 'y')], generalNotes: 'Capo 2\nRiff \n' });
  const other = n('c', 'T', 'B', 'S', 0, { sections: [sec('Verse', ['G'], 'riff 2', 'x')], generalNotes: 'Capo 2\nRiff' });
  assert.equal(contentFingerprint(base), contentFingerprint(same));
  assert.notEqual(contentFingerprint(base), contentFingerprint(other));
});

test('preset per playlist (P4): copie diverse solo nel preset si uniscono e ogni playlist conserva il suo preset', () => {
  const electric = n('e', 'Supersonic', 'Rock', 'Elettrico', 0, { presetSlot: '48', presetScene: '1', updatedAt: '2026-07-28T00:00:00.000Z' });
  const other = n('o', 'Supersonic', 'Emerald', 'Completa', 0, { presetSlot: '4', presetScene: '1', updatedAt: '2026-09-14T00:00:00.000Z' });
  const acoustic = n('x', 'Supersonic', 'Rock', 'Acustico', 0, { presetSlot: '', updatedAt: '2026-07-19T00:00:00.000Z' });
  const notes = [electric, other, acoustic];
  const plan = planPlaylistMigration({ notes, bands: [], setlists: [] });
  assert.deepEqual(plan.merges.map((m) => m.mergedInto), ['o', 'o']);
  const keeperNotes = indexNotes(notes.map((note) => ({ ...note, mergedInto: plan.merges.find((m) => m.noteId === note.id)?.mergedInto })));
  const preset = (name: string) => {
    const [entry] = playlistEntries({ id: name, name, bandId: '', userId: '', items: pl(plan, name).items }, keeperNotes);
    const { presetSlot, presetScene } = effectivePreset(entry.note, entry.item);
    return [entry.note.id, presetSlot, presetScene];
  };
  // Ogni playlist manda lo stesso preset di prima della conversione.
  assert.deepEqual(preset('Completa'), ['o', '4', '1']);
  assert.deepEqual(preset('Elettrico'), ['o', '48', '1']);
  assert.deepEqual(preset('Acustico'), ['o', '', '']);
  assert.deepEqual(pl(plan, 'Completa').items, [{ noteId: 'o' }]);
});

test('due copie unite nella stessa scaletta compaiono una volta sola', () => {
  const a = n('a', 'Song 2', 'B', 'S', 0, { updatedAt: '2026-01-01T00:00:00.000Z' });
  const b = n('b', 'Song 2', 'B', 'S', 5, { updatedAt: '2026-02-01T00:00:00.000Z' });
  const plan = planPlaylistMigration({ notes: [a, b], bands: [], setlists: [] });
  assert.deepEqual(noteIds(plan, 'S'), ['b']);
});

test('idempotenza: rieseguire il piano su dati già parzialmente convertiti dà lo stesso risultato', () => {
  const notes = [n('a', 'X', 'B', 'S', 0, { updatedAt: '2026-01-01T00:00:00.000Z' }), n('b', 'X', 'B', 'T', 0, { updatedAt: '2026-02-01T00:00:00.000Z' }), n('c', 'Y', 'B', 'S', 1)];
  const first = planPlaylistMigration({ notes, bands: [], setlists: [] });
  // Dopo un'interruzione: band e playlist create, note in parte marcate.
  const partialNotes = notes.map((note) => ({ ...note, mergedInto: first.merges.find((m) => m.noteId === note.id)?.mergedInto }));
  const second = planPlaylistMigration({
    notes: partialNotes,
    bands: [{ id: 'band-B', name: 'B' }],
    setlists: [{ id: 'pl-S', name: 'S', bandId: 'band-B', items: [{ noteId: 'b' }] }, { id: 'pl-T', name: 'T', bandId: 'band-B' }],
  });
  assert.deepEqual(second.merges, first.merges);
  assert.deepEqual(second.playlists.map((p) => [p.name, p.existingId, p.items]), first.playlists.map((p) => [p.name, p.name === 'S' ? 'pl-S' : 'pl-T', p.items]));
  assert.equal(second.summary.bandsCreated, 0);
  assert.equal(second.summary.playlistsCreated, 0);
});
