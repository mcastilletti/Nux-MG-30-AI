import assert from 'node:assert/strict';
import test from 'node:test';

import { isModelUnavailableError, pickGeminiCandidates, runWithModels } from './model';

const m = (name: string, methods = ['generateContent']) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

test('candidati: solo flash senza varianti, dal più recente; flash intero prima del lite', () => {
  const picked = pickGeminiCandidates([
    m('gemini-2.5-flash'), m('gemini-3.5-flash-lite'), m('gemini-3.8-flash'), m('gemini-3.5-flash'),
    m('gemini-3.8-flash-preview'), m('gemini-3.8-flash-image'), m('gemini-3.8-pro'), m('gemini-3.9-flash', ['embedContent']), m('text-embedding-004'),
  ]);
  assert.deepEqual(picked, ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash']);
  assert.deepEqual(pickGeminiCandidates([]), []);
});

test('errori che dicono "modello non disponibile"', () => {
  assert.equal(isModelUnavailableError(new Error('[404 Not Found] This model models/gemini-2.5-flash is no longer available to new users.')), true);
  assert.equal(isModelUnavailableError(new Error('NOT_FOUND: models/x')), true);
  assert.equal(isModelUnavailableError(new Error('[429] quota exceeded')), false);
  assert.equal(isModelUnavailableError(new Error('API key not valid')), false);
});

test('si passa al candidato successivo solo se il modello non esiste', async () => {
  const tried: string[] = [];
  let working = '';
  const result = await runWithModels(['a', 'b', 'c'], async (model) => {
    tried.push(model);
    if (model !== 'c') throw new Error('[404 Not Found] no longer available');
    return 'ok';
  }, (model) => { working = model; });
  assert.equal(result, 'ok');
  assert.deepEqual(tried, ['a', 'b', 'c']);
  assert.equal(working, 'c');
  await assert.rejects(runWithModels(['a', 'b'], async () => { throw new Error('quota exceeded 429'); }), /429/);
  await assert.rejects(runWithModels(['a', 'b'], async () => { throw new Error('[404] no longer available'); }), /no longer available/);
});
