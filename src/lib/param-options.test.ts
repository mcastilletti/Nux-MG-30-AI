import assert from 'node:assert/strict';
import test from 'node:test';

import { MG30_MODELS } from './mg30-data';
import { optionControlKind, optionIndexOf } from './param-options';

test('valore ↔ voce: min + indice, fuori elenco = -1', () => {
  assert.equal(optionIndexOf(0, 0, 8), 0);
  assert.equal(optionIndexOf(7, 0, 8), 7);
  assert.equal(optionIndexOf(8, 0, 8), -1);
  assert.equal(optionIndexOf(-1, 0, 3), -1);
});

test('pulsanti fino a 4 valori, menu oltre', () => {
  assert.equal(optionControlKind(3), 'buttons');
  assert.equal(optionControlKind(4), 'buttons');
  assert.equal(optionControlKind(8), 'select');
});

test('IR chitarra: microfoni e posizioni hanno i nomi della MG-30', () => {
  const ir = MG30_MODELS.ir.find((m) => m.id === 'ir-jz120')!;
  const mic = ir.parameters.find((p) => p.id === 'mic')!;
  const axis = ir.parameters.find((p) => p.id === 'axis')!;
  assert.deepEqual(mic.options, ['DYN421', 'S57', 'U87', 'R122', 'R121', 'C414', 'C3000', 'B52']);
  assert.deepEqual(axis.options, ['CENTER', 'MIDDLE', 'EDGE']);
});

test('ogni parametro a nomi ha tante voci quanti valori', () => {
  for (const models of Object.values(MG30_MODELS)) {
    for (const model of models) {
      for (const p of model.parameters) {
        if (p.options) assert.equal(p.options.length, p.max - p.min + 1, `${model.id}.${p.id}`);
      }
    }
  }
});
