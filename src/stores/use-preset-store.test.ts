import assert from 'node:assert/strict';
import test from 'node:test';

import { usePresetStore } from './use-preset-store';

test('updateParameter aggiorna la scena attiva e lascia intatte le altre', () => {
  const store = usePresetStore.getState();
  store.setActivePreset({ ...store.activePreset, slot: 42 });
  const before = usePresetStore.getState().activePreset;
  const amp = before.effects.find((e) => e.type === 'amp')!;
  const otherScenes = { 1: before.scenes![1], 2: before.scenes![2] };

  usePresetStore.getState().updateParameter(amp.id, 'gain', 77);

  const after = usePresetStore.getState().activePreset;
  assert.equal(after.effects.find((e) => e.id === amp.id)!.parameters.gain, 77);
  assert.equal(after.scenes![0].find((e) => e.id === amp.id)!.parameters.gain, 77);
  // La scena attiva è una copia, non lo stesso array degli effetti.
  assert.notEqual(after.scenes![0], after.effects);
  assert.deepEqual({ 1: after.scenes![1], 2: after.scenes![2] }, otherScenes);
});

test('dopo il cambio scena le modifiche restano nella scena giusta', () => {
  const store = usePresetStore.getState();
  store.setActivePreset({ ...store.activePreset, slot: 43 });
  const amp = usePresetStore.getState().activePreset.effects.find((e) => e.type === 'amp')!;
  usePresetStore.getState().updateParameter(amp.id, 'gain', 11);
  usePresetStore.getState().updateScene(1);
  usePresetStore.getState().updateParameter(amp.id, 'gain', 99);
  usePresetStore.getState().updateScene(0);

  const p = usePresetStore.getState().activePreset;
  assert.equal(p.effects.find((e) => e.id === amp.id)!.parameters.gain, 11);
  assert.equal(p.scenes![1].find((e) => e.id === amp.id)!.parameters.gain, 99);
});
