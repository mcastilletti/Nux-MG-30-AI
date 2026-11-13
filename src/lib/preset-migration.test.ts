import assert from 'node:assert/strict';
import test from 'node:test';

import { MG30_MODELS, SUBDIV_OPTIONS } from './mg30-data';
import { migrateOptionValue } from './preset-migration';
import { normalizePresetState } from './mg30-preset-normalizer';
import { fromPresetDoc, toPresetDoc } from './preset-storage';
import { decodeBlockState } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';

const option = (type: keyof typeof MG30_MODELS, model: string, param: string) =>
  MG30_MODELS[type].find((m) => m.id === model)!.parameters.find((p) => p.id === param)!;

test('selettori nell\'ordine della pedaliera (letto sul display)', () => {
  assert.deepEqual(SUBDIV_OPTIONS, ['1/32', '1/8T', '1/16', '1/4T', '1/8', '1/8D', '1/4']);
  assert.equal(SUBDIV_OPTIONS[6], '1/4', '214 in fabbrica = semiminima');
  assert.equal(SUBDIV_OPTIONS[5], '1/8D', '213 in fabbrica = croma puntata');
  assert.deepEqual(option('modulation', 'mod-harmony', 'scale').options, ['MAJOR', 'MINOR']);
  assert.deepEqual(option('modulation', 'mod-scf', 'mode').options, ['PITCH MODULATOR', 'CHORUS', 'FLANGER']);
  assert.deepEqual(option('modulation', 'mod-uvibe', 'mode').options, ['VIBRATO', 'CHORUS']);
});

test('schema 1 → 2: stessa etichetta, nuovo indice', () => {
  assert.equal(migrateOptionValue('delay', 'dly-digital', 'subdiv', 0), 6, '1/4');
  assert.equal(migrateOptionValue('delay', 'dly-duo', 'subdiv2', 1), 5, '1/8D');
  assert.equal(migrateOptionValue('modulation', 'mod-ce1', 'subdiv', 6), 0, '1/32');
  assert.equal(migrateOptionValue('modulation', 'mod-harmony', 'scale', 0), 1, 'MINOR');
  assert.equal(migrateOptionValue('modulation', 'mod-scf', 'mode', 0), 1, 'CHORUS');
  assert.equal(migrateOptionValue('modulation', 'mod-uvibe', 'mode', 1), 0, 'VIBRATO');
  assert.equal(migrateOptionValue('modulation', 'mod-harmony', 'key', 4), 4, 'Key non cambia');
  assert.equal(migrateOptionValue('amp', 'plexi100w', 'gain', 33), 33, 'manopole non toccate');
});

const presetWith = (type: string, model: string, parameters: Record<string, number>) => {
  const base = usePresetStore.getState().activePreset;
  const effects = base.effects.map((e) => (e.type === type ? { ...e, model, parameters } : e));
  return { ...base, slot: 9, effects, scenes: { 0: effects, 1: effects, 2: effects } };
};

test('un preset salvato con lo schema 1 viene convertito in lettura, uno con schema 2 no', () => {
  const doc = toPresetDoc(presetWith('delay', 'dly-digital', { level: 50, feedback: 50, time: 50, subdiv: 1 }));
  const subdiv = (d: unknown) => fromPresetDoc(d)!.effects.find((e) => e.type === 'delay')!.parameters.subdiv;
  assert.equal(subdiv({ ...doc, schemaVersion: 1 }), 5, '1/8D');
  assert.equal(subdiv(doc), 1, 'schema 2 invariato');
  const scene = fromPresetDoc({ ...doc, schemaVersion: 1 })!.scenes![2].find((e) => e.type === 'delay')!;
  assert.equal(scene.parameters.subdiv, 5, 'anche le scene');
});

test('normalizer: VOL MIN di fabbrica (0) resta 0, i selettori non vengono riscalati', () => {
  const vol = normalizePresetState(presetWith('vol', 'patch-vol', { min: 0, max: 100 })).preset.effects.find((e) => e.type === 'vol')!;
  assert.deepEqual(vol.parameters, { min: 0, max: 100 });
  const harm = normalizePresetState(presetWith('modulation', 'mod-harmony', { key: 40, scale: 1, harm: 0, blend: 100 })).preset.effects.find((e) => e.type === 'modulation')!;
  assert.equal(harm.parameters.key, 11, 'indice fuori elenco riportato nei limiti, non riscalato');
});

test('Horse Wah e EFX nel blocco compressore (preset di fabbrica 67 e 87)', () => {
  assert.equal(decodeBlockState('wah', 0x44)?.modelId, 'horsewah');
  assert.deepEqual(decodeBlockState('compressor', 12), { modelId: 'reddirt', enabled: true });
  assert.deepEqual(decodeBlockState('compressor', 72), { modelId: 'tscream', enabled: false });
  assert.equal(decodeBlockState('compressor', 2)?.modelId, 'kcomp');
});
