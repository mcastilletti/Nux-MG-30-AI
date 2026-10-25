import assert from 'node:assert/strict';
import test from 'node:test';

import { awaitWrite } from './firestore-write';

test('online e confermata: synced', async () => {
  assert.equal(await awaitWrite(Promise.resolve(), { online: true }), 'synced');
});

test('offline: queued subito, senza attendere la promise', async () => {
  const never = new Promise(() => {});
  assert.equal(await awaitWrite(never, { online: false }), 'queued');
});

test('online ma senza conferma entro il timeout: queued', async () => {
  const never = new Promise(() => {});
  assert.equal(await awaitWrite(never, { online: true, timeoutMs: 20 }), 'queued');
});

test('online con errore: l\'errore arriva al chiamante', async () => {
  await assert.rejects(awaitWrite(Promise.reject(new Error('permission-denied')), { online: true }), /permission-denied/);
});
