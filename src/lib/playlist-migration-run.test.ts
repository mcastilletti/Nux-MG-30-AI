import assert from 'node:assert/strict';
import test from 'node:test';

import type { SavedNote } from '@/types/note';
import { planPlaylistMigration } from './playlist-migration';
import { runPlaylistMigration, type MigrationWriter, type WriteOp } from './playlist-migration-run';

const n = (id: string, title: string, band: string, setlist: string, order: number, updatedAt = '2026-01-01T00:00:00.000Z'): SavedNote =>
  ({ id, title, band, setlist, order, sections: [], updatedAt });

function fakeWriter({ failOnBatch }: { failOnBatch?: number } = {}) {
  let next = 0; const batches: WriteOp[][] = [];
  const writer: MigrationWriter = {
    newId: (c) => `${c}-${++next}`,
    timestamp: () => 'TS',
    commit: async (ops) => {
      if (failOnBatch !== undefined && batches.length === failOnBatch) throw new Error('rete assente');
      batches.push(ops);
    },
  };
  return { writer, batches };
}

const notes = [n('a', 'X', 'Demo', 'Live', 0), n('b', 'X', 'Demo', 'Prove', 0, '2026-02-01T00:00:00.000Z'), n('c', 'Y', 'Demo', 'Live', 1)];

test('scrive band, playlist e duplicati, poi il marcatore per ultimo', async () => {
  const plan = planPlaylistMigration({ notes, bands: [], setlists: [] });
  const { writer, batches } = fakeWriter();
  const result = await runPlaylistMigration(plan, { uid: 'u1', writer });
  const all = batches.flat();
  assert.deepEqual(all.map((op) => op.path[0]), ['bands', 'setlists', 'setlists', 'notes', 'users']);
  assert.deepEqual(all[0], { path: ['bands', 'bands-1'], data: { name: 'Demo', userId: 'u1', logoUrl: null, createdAt: 'TS', updatedAt: 'TS' }, merge: false });
  const live = all.find((op) => op.data.name === 'Live')!;
  assert.deepEqual(live.data, { name: 'Live', bandId: 'bands-1', userId: 'u1', items: [{ noteId: 'b' }, { noteId: 'c' }], createdAt: 'TS', updatedAt: 'TS' });
  assert.deepEqual(all[3], { path: ['notes', 'a'], data: { mergedInto: 'b' }, merge: true });
  const marker = batches[batches.length - 1];
  assert.equal(marker.length, 1);
  assert.deepEqual(marker[0].path, ['users', 'u1', 'settings', 'notesModel']);
  assert.equal(marker[0].data.version, 2);
  assert.deepEqual(marker[0].data.summary, { playlists: 2, merged: 1, bandsCreated: 1 });
  assert.equal(result.batches, 2);
});

test('le scalette esistenti vengono aggiornate solo nei campi items e updatedAt', async () => {
  const plan = planPlaylistMigration({ notes, bands: [{ id: 'band-x', name: 'demo ' }], setlists: [{ id: 'set-live', name: 'Live', bandId: 'band-x' }] });
  const { writer, batches } = fakeWriter();
  await runPlaylistMigration(plan, { uid: 'u1', writer });
  const all = batches.flat();
  assert.equal(all.filter((op) => op.path[0] === 'bands').length, 0);
  assert.deepEqual(all.find((op) => op.path[1] === 'set-live'), { path: ['setlists', 'set-live'], data: { items: [{ noteId: 'b' }, { noteId: 'c' }], updatedAt: 'TS' }, merge: true });
});

test('a blocchi: con batchSize piccolo nessun blocco supera il limite', async () => {
  const many = Array.from({ length: 30 }, (_, i) => n(`n${i}`, `T${i % 10}`, 'B', `S${i % 3}`, i));
  const plan = planPlaylistMigration({ notes: many, bands: [], setlists: [] });
  const { writer, batches } = fakeWriter();
  const progress: number[] = [];
  await runPlaylistMigration(plan, { uid: 'u', writer, batchSize: 5, onProgress: (d) => progress.push(d) });
  assert.ok(batches.every((b) => b.length <= 5));
  assert.equal(progress[progress.length - 1], batches.length);
});

test('se un blocco fallisce il marcatore non viene scritto e la conversione si può ripetere', async () => {
  const many = Array.from({ length: 12 }, (_, i) => n(`n${i}`, `T${i % 4}`, 'B', `S${i % 2}`, i));
  const plan = planPlaylistMigration({ notes: many, bands: [], setlists: [] });
  const { writer, batches } = fakeWriter({ failOnBatch: 1 });
  await assert.rejects(runPlaylistMigration(plan, { uid: 'u', writer, batchSize: 3 }), /rete assente/);
  assert.equal(batches.flat().some((op) => op.path[0] === 'users'), false);
});
