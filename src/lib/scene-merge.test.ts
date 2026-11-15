import assert from 'node:assert/strict';
import test from 'node:test';

import type { Preset } from '@/types/preset';
import { createDefaultEffects } from '@/lib/default-effects';
import { mergeSceneIntoPreset, scenesAreIdentical } from './scene-merge';

const withGain = (gain: number) => createDefaultEffects().map((e) => (e.type === 'amp' ? { ...e, parameters: { ...e.parameters, gain } } : e));
const preset = (name: string, gains: [number, number, number]): Preset => ({
  slot: 5, name, activeScene: 0, category: 'x', tags: [], favorite: false, rating: 0, lastModified: new Date(0), ampModel: 'NUX MG-30',
  effects: withGain(gains[0]),
  scenes: { 0: withGain(gains[0]), 1: withGain(gains[1]), 2: withGain(gains[2]) },
});
const gainOf = (effects: Preset['effects']) => effects.find((e) => e.type === 'amp')!.parameters.gain;

test('scene uguali (fabbrica) o diverse', () => {
  assert.equal(scenesAreIdentical(preset('F', [50, 50, 50])), true);
  assert.equal(scenesAreIdentical(preset('A', [50, 60, 50])), false);
});

test('una scena dentro una scena: le altre e il nome restano, la scena di arrivo diventa attiva', () => {
  const base = preset('Mio suono', [10, 20, 30]);
  const source = preset('Fabbrica', [70, 80, 90]);
  const merged = mergeSceneIntoPreset(base, source, 2, 1);
  assert.equal(merged.name, 'Mio suono');
  assert.equal(merged.slot, 5);
  assert.deepEqual([0, 1, 2].map((i) => gainOf(merged.scenes![i])), [10, 90, 30]);
  assert.equal(merged.activeScene, 1);
  assert.equal(gainOf(merged.effects), 90);
});

test('non condivide gli oggetti con l\'origine né con la base', () => {
  const base = preset('B', [10, 20, 30]);
  const source = preset('S', [70, 80, 90]);
  const merged = mergeSceneIntoPreset(base, source, 0, 0);
  merged.scenes![0].find((e) => e.type === 'amp')!.parameters.gain = 1;
  assert.equal(gainOf(source.scenes![0]), 70);
  assert.equal(gainOf(base.scenes![1]), 20);
});
