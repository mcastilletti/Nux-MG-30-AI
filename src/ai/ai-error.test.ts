import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import { AiAuthError } from './guard';
import { aiFailureText, classifyAiError } from './ai-error';

test('errori di accesso e limite: codici e frasi per l\'utente, senza dettagli', () => {
  assert.deepEqual(classifyAiError(new AiAuthError('x', 401)), { ok: false, code: 'auth', message: 'Accedi con Google per usare le funzioni AI.' });
  assert.equal(classifyAiError(new AiAuthError('x', 429)).code, 'rate-limit');
  assert.equal(classifyAiError(new AiAuthError('x', 503)).code, 'unavailable');
});

test('chiave mancante o non valida: ai-config, con il motivo', () => {
  const missing = classifyAiError(new Error('Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.'));
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'ai-config');
  assert.match(missing.detail!, /GEMINI_API_KEY/);
  assert.equal(classifyAiError(new Error('[403 Forbidden] API_KEY_INVALID')).code, 'ai-config');
});

test('quota esaurita e altri errori', () => {
  assert.equal(classifyAiError(new Error('RESOURCE_EXHAUSTED: quota exceeded')).code, 'rate-limit');
  const other = classifyAiError(new TypeError('Cannot read properties of undefined'));
  assert.equal(other.code, 'ai-failed');
  assert.match(other.detail!, /^TypeError: Cannot read/);
});

test('input non valido da Zod; chiavi e testi lunghi non finiscono nel dettaglio', () => {
  const zod = z.object({ slots: z.array(z.number()).min(1) }).safeParse({ slots: [] });
  assert.equal(zod.success, false);
  if (!zod.success) assert.equal(classifyAiError(zod.error).code, 'invalid-request');
  const leaked = classifyAiError(new Error(`boom AIzaSyA1234567890abcdefghijklmnopqrstuv ${'x'.repeat(500)}`));
  assert.ok(!leaked.detail!.includes('AIzaSy'));
  assert.ok(leaked.detail!.length <= 260);
  assert.equal(aiFailureText({ ok: false, code: 'ai-failed', message: 'Fallita.', detail: 'Errore: x' }), 'Fallita. (Errore: x)');
  assert.equal(aiFailureText({ ok: false, code: 'auth', message: 'Accedi.' }), 'Accedi.');
});
