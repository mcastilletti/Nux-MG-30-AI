import assert from 'node:assert/strict';
import test from 'node:test';

import { usePresetStore } from '@/stores/use-preset-store';
import { buildPresetExport, fromPresetDoc, parsePresetImport, presetDocId, toPresetDoc } from './preset-storage';

const basePreset = () => ({ ...usePresetStore.getState().activePreset, slot: 7, name: 'Clean ES-335' });

test('toPresetDoc produce JSON puro con id per slot', () => {
  const doc = toPresetDoc(basePreset());
  assert.equal(doc.id, presetDocId(7));
  assert.equal(doc.id, 'slot_7');
  assert.equal(typeof doc.lastModified, 'string');
  assert.deepEqual(Object.keys(doc.scenes).sort(), ['0', '1', '2']);
  // Nessun undefined: Firestore li rifiuta.
  assert.equal(JSON.stringify(doc).includes('undefined'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(doc)), doc);
});

test('andata e ritorno conserva nome, slot, scena e parametri', () => {
  const preset = basePreset();
  preset.effects = preset.effects.map((e) => (e.type === 'amp' ? { ...e, parameters: { ...e.parameters, gain: 72 } } : e));
  preset.scenes = { ...preset.scenes, [preset.activeScene]: preset.effects };
  const restored = fromPresetDoc(JSON.parse(JSON.stringify(toPresetDoc(preset))));
  assert.ok(restored);
  assert.equal(restored.slot, 7);
  assert.equal(restored.name, 'Clean ES-335');
  assert.equal(restored.effects.find((e) => e.type === 'amp')?.parameters.gain, 72);
  assert.ok(restored.lastModified instanceof Date);
});

test('fromPresetDoc rifiuta dati non validi', () => {
  assert.equal(fromPresetDoc(null), null);
  assert.equal(fromPresetDoc({ slot: 0, effects: [] }), null);
  assert.equal(fromPresetDoc({ slot: 200, effects: toPresetDoc(basePreset()).effects }), null);
  assert.equal(fromPresetDoc({ slot: 3, effects: [{ id: 'x', type: 'boh', model: 'm', parameters: {} }] }), null);
});

test('fromPresetDoc riporta i parametri nei limiti del modello', () => {
  const doc = toPresetDoc(basePreset());
  doc.effects = doc.effects.map((e) => (e.type === 'amp' ? { ...e, parameters: { ...e.parameters, gain: 999 } } : e));
  const restored = fromPresetDoc(doc);
  assert.ok(restored);
  const gain = restored.effects.find((e) => e.type === 'amp')?.parameters.gain as number;
  assert.ok(gain <= 100, `gain ${gain} fuori limite`);
});

test('esportazione e importazione', () => {
  const file = buildPresetExport([basePreset(), { ...basePreset(), slot: 2, name: 'Lead' }], new Date('2026-10-25T00:00:00Z'));
  assert.deepEqual(file.presets.map((p) => p.slot), [2, 7]);
  const result = parsePresetImport(JSON.stringify(file));
  assert.ok(result.ok);
  if (result.ok) {
    assert.deepEqual(result.presets.map((p) => p.name), ['Lead', 'Clean ES-335']);
    assert.equal(result.skipped, 0);
  }
});

test('importazione: errori leggibili e preset non validi scartati', () => {
  assert.equal(parsePresetImport('non json').ok, false);
  assert.equal(parsePresetImport('{"format":"altro"}').ok, false);
  const file = buildPresetExport([basePreset()]);
  assert.equal(parsePresetImport(JSON.stringify({ ...file, version: 99 })).ok, false);
  const mixed = { ...file, presets: [...file.presets, { slot: 999 }] };
  const result = parsePresetImport(JSON.stringify(mixed));
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.skipped, 1);
  assert.equal(parsePresetImport(JSON.stringify({ ...file, presets: [{ slot: 999 }] })).ok, false);
});
