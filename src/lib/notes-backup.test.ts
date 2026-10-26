import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { buildNotesBackup, notesBackupFileName, toJsonValue } from './notes-backup';

const ts = (iso: string) => ({ toDate: () => new Date(iso), seconds: 1 });

const notes: SavedNote[] = [
  { id: 'b', title: 'Creep', band: 'Demo', setlist: 'Live', order: 2, presetSlot: '9', sections: [{ id: 's', type: 'Verse', chords: ['G'], text: 'x' }], updatedAt: ts('2026-10-01T10:00:00.000Z') },
  { id: 'a', title: 'Wonderwall', band: 'Demo', setlist: 'Live', order: 0, userId: 'u1' },
  { id: 'p', title: 'Pausa', band: 'Demo', setlist: 'Live', order: 1, type: 'block', blockContent: 'Drop D' },
  { id: 'z', title: 'Angels', band: 'Altra', setlist: 'Prove', order: 0 },
];

test('conserva tutti i campi, compresi band, scaletta e ordine', () => {
  const file = buildNotesBackup({ notes, source: 'cloud', now: new Date('2026-10-26T12:00:00.000Z') });
  const creep = file.notes.find((n) => n.id === 'b')!;
  assert.equal(creep.band, 'Demo');
  assert.equal(creep.setlist, 'Live');
  assert.equal(creep.order, 2);
  assert.deepEqual(creep.sections, notes[0].sections);
  assert.equal(creep.updatedAt, '2026-10-01T10:00:00.000Z');
  assert.equal(file.notes.find((n) => n.id === 'p')!.blockContent, 'Drop D');
});

test('ordina per band, scaletta e ordine, e conta brani e blocchi', () => {
  const file = buildNotesBackup({ notes, bands: [{ id: 'b1', name: 'Demo', createdAt: ts('2026-01-01T00:00:00.000Z') }], setlists: [{ id: 's1', name: 'Live' }], source: 'cloud' });
  assert.deepEqual(file.notes.map((n) => n.id), ['z', 'a', 'p', 'b']);
  assert.deepEqual(file.counts, { notes: 4, songs: 3, blocks: 1, bands: 1, setlists: 1 });
  assert.equal(file.bands[0].createdAt, '2026-01-01T00:00:00.000Z');
});

test('il file è JSON valido e rileggibile', () => {
  const file = buildNotesBackup({ notes, source: 'device', now: new Date('2026-10-26T12:00:00.000Z') });
  const back = JSON.parse(JSON.stringify(file));
  assert.equal(back.format, 'mg30-notes-backup');
  assert.equal(back.source, 'device');
  assert.equal(back.notes.length, 4);
  assert.equal(notesBackupFileName(file), 'mg30-note-backup-2026-10-26.json');
});

test('toJsonValue converte Date annidate e scarta undefined', () => {
  assert.deepEqual(toJsonValue({ a: new Date('2026-01-02T00:00:00.000Z'), b: undefined, c: [ts('2026-01-03T00:00:00.000Z')] }), { a: '2026-01-02T00:00:00.000Z', c: ['2026-01-03T00:00:00.000Z'] });
});
