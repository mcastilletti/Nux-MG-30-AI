import assert from 'node:assert/strict';
import test from 'node:test';

import { DEVICE_KINDS } from '@/components/device-art/types';
import { SHAPES } from '@/components/device-art/shapes';
import { AMP_ART } from '@/components/device-art/amp-art';
import { MG30_MODELS } from './mg30-data';
import { CAB_KIND, MIC_KIND, deviceArtFor, micKindFor } from './device-art-map';

test('ogni sagoma ha un disegno', () => {
  for (const kind of DEVICE_KINDS) assert.equal(typeof SHAPES[kind], 'function', kind);
});

test('ogni modello, anche i nuovi, ha una sagoma valida', () => {
  for (const [type, models] of Object.entries(MG30_MODELS)) {
    for (const model of models) {
      const spec = deviceArtFor(type as keyof typeof MG30_MODELS, model.id);
      assert.ok(DEVICE_KINDS.includes(spec.kind), `${type}/${model.id}`);
      if (spec.kind === 'stomp') assert.ok(spec.knobs! >= 1 && spec.knobs! <= 4, `${type}/${model.id} manopole`);
    }
  }
});

test('ogni IR ha una cassa propria e ogni microfono un tipo', () => {
  for (const model of MG30_MODELS.ir) assert.ok(CAB_KIND[model.id], model.id);
  const mic = MG30_MODELS.ir.find((m) => m.id === 'ir-jz120')!.parameters.find((p) => p.id === 'mic')!;
  for (const label of mic.options!) assert.ok(MIC_KIND[label], label);
  assert.equal(micKindFor('R122'), 'mic-ribbon');
  assert.equal(micKindFor(undefined), 'mic-dynamic');
});

test('forme per tipo di blocco: wah, volume, ampli e cassa non sono pedali', () => {
  assert.equal(deviceArtFor('wah', 'horsewah').kind, 'wah');
  assert.equal(deviceArtFor('vol', 'patch-vol').kind, 'expression');
  assert.deepEqual(deviceArtFor('amp', 'plexi100w'), { kind: 'amp', model: 'plexi100w' });
  assert.deepEqual(deviceArtFor('amp', 'twinrvb'), { kind: 'amp', model: 'twinrvb' });
  assert.equal(deviceArtFor('ir', 'ir-1960').kind, 'cab-4x12');
  assert.equal(deviceArtFor('ir', 'ir-user').kind, 'user-ir');
  assert.deepEqual(deviceArtFor('efx', 'tscream'), { kind: 'stomp', knobs: 3 });
  assert.deepEqual(deviceArtFor('compressor', 'reddirt'), { kind: 'stomp', knobs: 3 }, 'EFX nel blocco COMP');
  assert.deepEqual(deviceArtFor('modulation', 'mod-ph90'), { kind: 'stomp', knobs: 1 });
});

test('ogni ampli ha un disegno proprio', () => {
  for (const model of MG30_MODELS.amp) assert.ok(AMP_ART[model.id], `ampli ${model.id}`);
  assert.equal(Object.keys(AMP_ART).length, MG30_MODELS.amp.length);
});
