import assert from 'node:assert/strict';
import test from 'node:test';

import { MG30_MODELS } from './mg30-data';
import { FACTORY_PRESETS, factoryPresetToPreset, getFactoryPreset } from './factory-presets';
import { fromPresetDoc, toPresetDoc } from './preset-storage';
import { normalizePresetState } from './mg30-preset-normalizer';

const label = (slot: number, type: string, param: string) => {
  const effect = getFactoryPreset(slot)!.effects.find((e) => e.type === type)!;
  const p = MG30_MODELS[effect.type].find((m) => m.id === effect.model)!.parameters.find((q) => q.id === param)!;
  const value = effect.parameters[param] as number;
  return p.options ? p.options[value - p.min] : value;
};

test('128 preset di fabbrica, uno per slot, con tutti i 12 blocchi', () => {
  assert.equal(FACTORY_PRESETS.length, 128);
  assert.deepEqual(FACTORY_PRESETS.map((p) => p.slot), Array.from({ length: 128 }, (_, i) => i + 1));
  for (const p of FACTORY_PRESETS) assert.equal(new Set(p.effects.map((e) => e.type)).size, 12, `slot ${p.slot}`);
});

test('ogni valore di fabbrica è valido per l\'app: modello noto, parametri nei limiti', () => {
  for (const preset of FACTORY_PRESETS) {
    for (const effect of preset.effects) {
      const model = MG30_MODELS[effect.type].find((m) => m.id === effect.model);
      assert.ok(model, `slot ${preset.slot}: ${effect.type}/${effect.model}`);
      for (const p of model.parameters) {
        const v = effect.parameters[p.id];
        assert.equal(typeof v, 'number', `slot ${preset.slot} ${effect.model}.${p.id}`);
        assert.ok((v as number) >= p.min && (v as number) <= p.max, `slot ${preset.slot} ${effect.model}.${p.id} = ${v}`);
      }
    }
  }
});

test('il normalizer e il salvataggio non alterano nessun preset di fabbrica', () => {
  for (const factory of FACTORY_PRESETS) {
    const preset = factoryPresetToPreset(factory);
    const normalized = normalizePresetState(preset);
    assert.equal(normalized.correctedCount, 0, `slot ${factory.slot}: ${normalized.warnings.join('; ')}`);
    const restored = fromPresetDoc(JSON.parse(JSON.stringify(toPresetDoc(preset))))!;
    assert.deepEqual(restored.effects, preset.effects, `slot ${factory.slot}`);
    assert.equal(restored.name, factory.name);
  }
});

test('valori letti sul display della pedaliera', () => {
  assert.equal(getFactoryPreset(1)!.name, 'CT-RectoBeast');
  // 18 VT Clean Chorus: S.C.F. su CHO con Sub Div a semiminima, Pan Delay a semiminima.
  assert.equal(label(18, 'modulation', 'mode'), 'CHORUS');
  assert.equal(label(18, 'modulation', 'subdiv'), '1/4');
  assert.equal(label(18, 'delay', 'subdiv'), '1/4');
  // 3 CT-AmbientClean: DUOTIME Sub Div 2 = croma puntata.
  assert.equal(label(3, 'delay', 'subdiv2'), '1/8D');
  // 10 LT BLUES DELUXE: U-Vibe su CHO.
  assert.equal(label(10, 'modulation', 'mode'), 'CHORUS');
  // 79 GY I'm Bassist: Harmonizer E minore, -8, Blend al massimo.
  assert.deepEqual(['key', 'scale', 'harm', 'blend'].map((p) => label(79, 'modulation', p)), ['E', 'MINOR', '-8', 100]);
  // 17 VT Blues Lead: BS410, R122, MIDDLE, +2 dB, 20 Hz, 20 kHz.
  assert.equal(getFactoryPreset(17)!.effects.find((e) => e.type === 'ir')!.model, 'ir-bs410');
  assert.deepEqual(['mic', 'axis', 'level', 'lowcut', 'highcut'].map((p) => label(17, 'ir', p)), ['R122', 'MIDDLE', 2, 20, 20000]);
  // 11 LT PLEXI CRUNCH: Horse Wah, Contour 61, Range in 3ª posizione.
  assert.equal(getFactoryPreset(11)!.effects.find((e) => e.type === 'wah')!.model, 'horsewah');
  assert.deepEqual([label(11, 'wah', 'contour'), label(11, 'wah', 'range')], [61, '3']);
  // 67 e 87: secondo EFX nel blocco compressore.
  assert.equal(getFactoryPreset(67)!.effects.find((e) => e.type === 'compressor')!.model, 'reddirt');
  assert.equal(getFactoryPreset(87)!.effects.find((e) => e.type === 'compressor')!.model, 'tscream');
});
