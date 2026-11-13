import assert from 'node:assert/strict';
import test from 'node:test';

import { archivedSoundToPreset, createArchivedSound, parseArchivedSound, renameArchivedSound } from './sound-archive';
import { FACTORY_PRESETS, factoryPresetToPreset } from './factory-presets';

test('un suono archiviato conserva tutto il preset e si rimette in qualsiasi slot', () => {
  const original = factoryPresetToPreset(FACTORY_PRESETS[0]);
  const sound = createArchivedSound(original, 'slot', { originSlot: 1, now: new Date('2026-11-13T10:00:00Z') });
  assert.equal(sound.name, 'CT-RectoBeast');
  assert.equal(sound.originSlot, 1);
  const parsed = parseArchivedSound(JSON.parse(JSON.stringify(sound)));
  assert.ok(parsed);
  const back = archivedSoundToPreset(parsed, 77);
  assert.equal(back.slot, 77);
  assert.deepEqual(back.effects, original.effects);
  assert.deepEqual(back.scenes, original.scenes);
});

test('rinomina e documenti non validi', () => {
  const sound = createArchivedSound(factoryPresetToPreset(FACTORY_PRESETS[1]), 'editor');
  const renamed = renameArchivedSound(sound, '  Mio lead  ');
  assert.equal(renamed.name, 'Mio lead');
  assert.equal(renamed.preset.name, 'Mio lead');
  assert.equal(parseArchivedSound({ id: 'x', preset: { slot: 999 } }), null);
  assert.equal(parseArchivedSound(null), null);
});
