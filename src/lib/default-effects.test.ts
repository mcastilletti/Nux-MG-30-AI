import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultEffects } from './default-effects';
import { INITIAL_PRESETS } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';

test('12 blocchi, id unici, un blocco per tipo', () => {
  const effects = createDefaultEffects();
  assert.equal(effects.length, 12);
  assert.equal(new Set(effects.map((e) => e.id)).size, 12);
  assert.equal(new Set(effects.map((e) => e.type)).size, 12);
});

test('stesso ordine nel preset iniziale dell\'editor e negli slot della libreria', () => {
  const order = createDefaultEffects().map((e) => e.type);
  assert.deepEqual(usePresetStore.getState().activePreset.effects.map((e) => e.type), order);
  assert.deepEqual(INITIAL_PRESETS[5].effects.map((e) => e.type), order);
});

test('ogni chiamata restituisce oggetti nuovi', () => {
  const a = createDefaultEffects(); const b = createDefaultEffects();
  assert.notEqual(a[0], b[0]);
  assert.notEqual(a[0].parameters, b[0].parameters);
});
