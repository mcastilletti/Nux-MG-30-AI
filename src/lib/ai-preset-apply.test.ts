import assert from 'node:assert/strict';
import test from 'node:test';

import type { Preset } from '@/types/preset';
import { createDefaultEffects } from '@/lib/default-effects';
import { AI_PATCH_VOLUME, applyPatchVolume, applySuggestionToScene } from './ai-preset-apply';

const effects = (gain: number, vol = { min: 30, max: 60 }) =>
  createDefaultEffects().map((e) => (e.type === 'amp' ? { ...e, parameters: { ...e.parameters, gain } } : e.type === 'vol' ? { ...e, parameters: { ...e.parameters, ...vol } } : e));
const preset = (): Preset => ({
  slot: 4, name: 'Mio', activeScene: 0, category: 'x', tags: [], favorite: false, rating: 0, lastModified: new Date(0), ampModel: 'NUX MG-30',
  effects: effects(10), scenes: { 0: effects(10), 1: effects(20), 2: effects(30) },
});
const gain = (e: Preset['effects']) => e.find((x) => x.type === 'amp')!.parameters.gain;
const vol = (e: Preset['effects']) => e.find((x) => x.type === 'vol')!.parameters;
const suggestion = { name: 'AI', explanation: '', effects: [{ type: 'amp' as const, model: 'brit800', enabled: true, parameters: [{ name: 'gain', value: 72 }] }, { type: 'vol' as const, model: '', enabled: false, parameters: [{ name: 'min', value: 5 }] }] };

test('volume di patch: MIN 50 e MAX 100 in effetti e in tutte le scene', () => {
  const p = applyPatchVolume(preset());
  assert.deepEqual([vol(p.effects).min, vol(p.effects).max], [AI_PATCH_VOLUME.min, AI_PATCH_VOLUME.max]);
  for (const i of [0, 1, 2]) assert.deepEqual([vol(p.scenes![i]).min, vol(p.scenes![i]).max], [50, 100]);
});

test('proposta dell\'AI su una sola scena: le altre due restano com\'erano', () => {
  const { updatedPreset, changes } = applySuggestionToScene(preset(), suggestion, 2);
  assert.equal(updatedPreset.activeScene, 2);
  assert.equal(gain(updatedPreset.effects), 72);
  assert.deepEqual([0, 1, 2].map((i) => gain(updatedPreset.scenes![i])), [10, 20, 72]);
  assert.equal(updatedPreset.name, 'Mio');
  assert.ok(changes.some((c) => c.type === 'amp' && c.label === 'Gain'));
});

test('l\'AI non può cambiare il volume di patch, anche se lo propone', () => {
  const { updatedPreset, changes } = applySuggestionToScene(preset(), suggestion, 0);
  assert.deepEqual([vol(updatedPreset.effects).min, vol(updatedPreset.effects).max], [50, 100]);
  assert.deepEqual(changes.filter((c) => c.type === 'vol').map((c) => [c.label, c.from, c.to]), [['VOL MIN', 30, 50], ['VOL MAX', 60, 100]]);
});

test('non modifica il preset di partenza', () => {
  const p = preset();
  applySuggestionToScene(p, suggestion, 1);
  assert.equal(gain(p.scenes![1]), 20);
  assert.equal(vol(p.scenes![1]).min, 30);
});
