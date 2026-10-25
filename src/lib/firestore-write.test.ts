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

test('rifiuto dopo il timeout: segnalato a onLateError', async () => {
  let reject!: (e: Error) => void;
  const write = new Promise((_, r) => { reject = r; });
  const late: unknown[] = [];
  assert.equal(await awaitWrite(write, { online: true, timeoutMs: 10, onLateError: (e) => late.push(e) }), 'queued');
  reject(new Error('permission-denied'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(late.length, 1);
});

test('rifiuto di una scrittura offline: segnalato', async () => {
  let reject!: (e: Error) => void;
  const write = new Promise((_, r) => { reject = r; });
  const late: unknown[] = [];
  assert.equal(await awaitWrite(write, { online: false, onLateError: (e) => late.push(e) }), 'queued');
  reject(new Error('unauthenticated'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(late.length, 1);
});

test('rifiuto immediato online: arriva al chiamante, non doppio nel log', async () => {
  const late: unknown[] = [];
  await assert.rejects(awaitWrite(Promise.reject(new Error('x')), { online: true, onLateError: (e) => late.push(e) }));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(late.length, 0);
});
