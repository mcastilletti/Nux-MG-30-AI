import assert from 'node:assert/strict';
import test from 'node:test';

import type { Preset } from '@/types/preset';
import { normalizePresetSuggestion } from './mg30-preset-normalizer';

const basePreset = (): Preset => ({
  name: 'Test',
  slot: 1,
  activeScene: 0,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(0),
  ampModel: 'NUX MG-30',
  effects: [
    { id: 'delay', type: 'delay', model: 'dly-tape', enabled: true, parameters: { time: 70, level: 40, repeat: 55, subdiv: 2 } },
    { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 50, level: 50 } },
  ],
});

test('an empty model turns a block off without changing its model or parameters', () => {
  const { updatedPreset, warnings } = normalizePresetSuggestion(basePreset(), {
    name: 'x',
    explanation: 'x',
    effects: [{ type: 'delay', model: '', enabled: false, parameters: [] }],
  });

  const delay = updatedPreset.effects.find(effect => effect.type === 'delay')!;
  assert.equal(delay.enabled, false);
  assert.equal(delay.model, 'dly-tape');
  assert.deepEqual(delay.parameters, { time: 70, level: 40, repeat: 55, subdiv: 2 });
  assert.deepEqual(warnings, []);
});

test('accepts the documented Studio Compressor parameters', () => {
  const { updatedPreset, warnings } = normalizePresetSuggestion(basePreset(), {
    name: 'x',
    explanation: 'x',
    effects: [{
      type: 'compressor',
      model: 'studiocomp',
      enabled: true,
      parameters: [{ name: 'gain', value: 60 }, { name: 'release', value: 30 }],
    }],
  });

  const compressor = updatedPreset.effects.find(effect => effect.type === 'compressor')!;
  assert.equal(compressor.model, 'studiocomp');
  assert.equal(compressor.enabled, true);
  assert.equal(compressor.parameters.gain, 60);
  assert.equal(compressor.parameters.release, 30);
  assert.deepEqual(warnings, []);
});
