import assert from 'node:assert/strict';
import test from 'node:test';

import { usePresetStore } from '@/stores/use-preset-store';
import type { Preset } from '@/types/preset';
import { mergePresetImports, presetFileName, buildPresetExport } from './preset-storage';
import { buildPresetZip, readPresetZip } from './preset-zip';
import { FACTORY_PRESETS, factoryPresetToPreset } from './factory-presets';

const preset = (slot: number, name: string) => ({ ...usePresetStore.getState().activePreset, slot, name });

test('nome del file: slot e nome senza caratteri strani', () => {
  assert.equal(presetFileName({ slot: 1, name: 'CT-RectoBeast' }), 'mg30-01A-CT-RectoBeast.json');
  assert.equal(presetFileName({ slot: 8, name: "PeteT 80's Clean" }), 'mg30-02D-PeteT-80-s-Clean.json');
  assert.equal(presetFileName({ slot: 128, name: '  ' }), 'mg30-32D.json');
});

test('ZIP: un file per preset, si reimporta tutto uguale', async () => {
  const presets = FACTORY_PRESETS.map((f) => factoryPresetToPreset(f));
  const blob = await buildPresetZip(presets, new Date('2026-11-13T00:00:00Z'));
  const files = await readPresetZip(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(files.length, 128);
  const result = mergePresetImports(files);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.presets.length, 128);
  assert.equal(result.skipped, 0);
  for (const p of presets) {
    const back: Preset = result.presets.find((r) => r.slot === p.slot)!;
    assert.equal(back.name, p.name);
    assert.deepEqual(back.effects, p.effects, `slot ${p.slot}`);
    assert.deepEqual(back.scenes, p.scenes, `slot ${p.slot} scene`);
  }
});

test('più file: vince l\'ultimo per slot, i file non validi vengono segnalati', () => {
  const a = JSON.stringify(buildPresetExport([preset(3, 'Vecchio'), preset(4, 'Quattro')]));
  const b = JSON.stringify(buildPresetExport([preset(3, 'Nuovo')]));
  const result = mergePresetImports([{ name: 'a.json', text: a }, { name: 'b.json', text: b }, { name: 'c.json', text: 'rotto' }]);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.presets.map((p) => [p.slot, p.name]), [[3, 'Nuovo'], [4, 'Quattro']]);
  assert.equal(result.errors?.length, 1);
  assert.equal(mergePresetImports([{ name: 'c.json', text: 'rotto' }]).ok, false);
});

test('un file esportato con lo schema 1 si importa ancora (selettori convertiti)', () => {
  const p = preset(5, 'Vecchio file');
  const file = buildPresetExport([p]);
  const v1 = { ...file, version: 1, presets: file.presets.map((d) => ({ ...d, schemaVersion: 1 })) };
  const result = mergePresetImports([{ name: 'v1.json', text: JSON.stringify(v1) }]);
  assert.ok(result.ok);
});
