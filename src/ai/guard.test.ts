import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAiCall, AiAuthError, __resetAiRateLimit } from './guard';

const realFetch = globalThis.fetch;
let lookups = 0;

function mockLookup(body: unknown, ok = true) {
  globalThis.fetch = (async () => {
    lookups++;
    return { ok, json: async () => body } as Response;
  }) as typeof fetch;
}

beforeEach(() => { lookups = 0; __resetAiRateLimit(); });
afterEach(() => { globalThis.fetch = realFetch; });

test('rifiuta token mancante o non stringa senza chiamare la rete', async () => {
  mockLookup({ users: [{ localId: 'u1' }] });
  for (const bad of [undefined, null, '', 42, 'x'.repeat(5000)]) {
    await assert.rejects(authorizeAiCall(bad), (e: unknown) => e instanceof AiAuthError && e.status === 401);
  }
  assert.equal(lookups, 0);
});

test('rifiuta token non valido o utente disabilitato', async () => {
  mockLookup({}, false);
  await assert.rejects(authorizeAiCall('tok'), (e: unknown) => e instanceof AiAuthError && e.status === 401);
  mockLookup({ users: [{ localId: 'u1', disabled: true }] });
  await assert.rejects(authorizeAiCall('tok'), (e: unknown) => e instanceof AiAuthError && e.status === 401);
});

test('accetta token valido e restituisce uid', async () => {
  mockLookup({ users: [{ localId: 'u1' }] });
  assert.equal(await authorizeAiCall('tok'), 'u1');
});

test('limita a 10 chiamate al minuto per utente, non per altri utenti', async () => {
  mockLookup({ users: [{ localId: 'u1' }] });
  for (let i = 0; i < 10; i++) await authorizeAiCall('tok');
  await assert.rejects(authorizeAiCall('tok'), (e: unknown) => e instanceof AiAuthError && e.status === 429);
  mockLookup({ users: [{ localId: 'u2' }] });
  assert.equal(await authorizeAiCall('tok2'), 'u2');
});

test('errore di rete -> 503', async () => {
  globalThis.fetch = (async () => { throw new Error('down'); }) as typeof fetch;
  await assert.rejects(authorizeAiCall('tok'), (e: unknown) => e instanceof AiAuthError && e.status === 503);
});
