import assert from 'node:assert/strict';
import test from 'node:test';

import { INITIAL_PRESETS } from '@/stores/use-midi-store';
import { isPlaceholderPreset } from './slot-content';
import { FACTORY_PRESETS, factoryPresetToPreset } from './factory-presets';

test('slot mai letto: preset di partenza dell\'app', () => {
  assert.equal(isPlaceholderPreset(INITIAL_PRESETS[4]), true);
  assert.equal(isPlaceholderPreset(INITIAL_PRESETS[4], 'Il mio clean'), false, 'rinominato');
  assert.equal(isPlaceholderPreset(factoryPresetToPreset(FACTORY_PRESETS[4])), false);
  const changed = { ...INITIAL_PRESETS[4], effects: INITIAL_PRESETS[4].effects.map((e) => (e.type === 'amp' ? { ...e, parameters: { ...e.parameters, gain: 77 } } : e)) };
  assert.equal(isPlaceholderPreset(changed), false);
});
