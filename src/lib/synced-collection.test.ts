import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeRemote } from './synced-collection';

const item = (id: string, updatedAt: string, name = id) => ({ id, updatedAt, name });

test('vince la versione più recente; quella locale più nuova viene caricata', () => {
  const local = { items: { a: item('a', '2026-11-02T00:00:00Z', 'locale'), b: item('b', '2026-11-01T00:00:00Z', 'vecchio') }, synced: ['a', 'b'] };
  const remote = [item('a', '2026-11-01T00:00:00Z', 'cloud'), item('b', '2026-11-03T00:00:00Z', 'nuovo')];
  const { state, upload } = mergeRemote(local, remote);
  assert.equal(state.items.a.name, 'locale');
  assert.equal(state.items.b.name, 'nuovo');
  assert.deepEqual(upload.map((u) => u.id), ['a']);
});

test('documento solo locale: caricato; già sincronizzato e sparito dal cloud: cancellato', () => {
  const local = { items: { nuovo: item('nuovo', '2026-11-01T00:00:00Z'), cancellato: item('cancellato', '2026-11-01T00:00:00Z') }, synced: ['cancellato'] };
  const { state, upload } = mergeRemote(local, []);
  assert.deepEqual(Object.keys(state.items), ['nuovo']);
  assert.deepEqual(upload.map((u) => u.id), ['nuovo']);
  assert.deepEqual(state.synced, ['nuovo']);
});
