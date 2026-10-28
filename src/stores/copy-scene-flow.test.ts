import assert from 'node:assert/strict';
import test from 'node:test';

import { usePresetStore, cloneEffects } from './use-preset-store';
import { useMidiStore } from './use-midi-store';
import { Preset } from '@/types/preset';
import { MG30_MODELS } from '@/lib/mg30-data';

/** Riproduce esattamente handleCopyScene() di src/app/editor/page.tsx, senza MIDI. */
function handleCopyScene(sourceScene: number, targetSlot: number, targetScene: number) {
  const { activePreset, copyScene, setActivePreset } = usePresetStore.getState();
  const { devicePresets } = useMidiStore.getState();

  const targetPresetRaw = devicePresets.find((preset) => preset.slot === targetSlot) || activePreset;
  const updatedTarget = copyScene(sourceScene, targetPresetRaw, targetScene);

  const destination: Preset = {
    ...updatedTarget,
    slot: targetSlot,
    activeScene: targetScene,
    effects: cloneEffects(updatedTarget.scenes![targetScene]),
    name: updatedTarget.name,
    lastModified: new Date(),
  };

  useMidiStore.setState((state) => ({
    devicePresets: state.devicePresets.map((preset) => preset.slot === targetSlot ? destination : preset),
  }));

  setActivePreset(destination);
}

test('flusso UI completo: copia scena stesso preset, scena attiva -> altra scena', () => {
  const { setActivePreset, updateParameter } = usePresetStore.getState();
  setActivePreset({ ...usePresetStore.getState().activePreset, slot: 10 });

  const amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  updateParameter(amp.id, 'gain', 42);
  updateParameter(amp.id, 'bass', 7);

  // Scena 1 (destinazione) ha valori diversi.
  usePresetStore.getState().updateScene(1);
  const amp1 = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  updateParameter(amp1.id, 'gain', 99);

  // Torno sulla scena 0 (origine) e copio -> scena 1, stesso preset (slot 10).
  usePresetStore.getState().updateScene(0);
  handleCopyScene(0, 10, 1);

  const after = usePresetStore.getState().activePreset;
  assert.equal(after.slot, 10);
  assert.equal(after.activeScene, 1, 'dopo la copia si passa alla scena di destinazione');
  const ampAfter = after.effects.find(e => e.type === 'amp')!;
  assert.equal(ampAfter.parameters.gain, 42, 'la scena 1 ora ha i parametri copiati dalla scena 0');
  assert.equal(ampAfter.parameters.bass, 7);

  // La scena 0 deve restare intatta.
  assert.equal(after.scenes![0].find(e => e.type === 'amp')!.parameters.gain, 42);
  assert.equal(after.scenes![0].find(e => e.type === 'amp')!.parameters.bass, 7);
});

test('flusso UI completo: copia scena cross-preset verso preset non attivo in devicePresets', () => {
  const { setActivePreset, updateParameter } = usePresetStore.getState();
  setActivePreset({ ...usePresetStore.getState().activePreset, slot: 20, activeScene: 0 });
  const amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  updateParameter(amp.id, 'gain', 13);

  // Preset target slot 21 esiste già in devicePresets con le sue scene (INITIAL_PRESETS).
  handleCopyScene(0, 21, 2);

  const target = useMidiStore.getState().devicePresets.find(p => p.slot === 21)!;
  assert.equal(target.scenes![2].find(e => e.type === 'amp')!.parameters.gain, 13, 'scena 2 del preset 21 copiata dalla scena 0 del preset 20');

  const active = usePresetStore.getState().activePreset;
  assert.equal(active.slot, 21);
  assert.equal(active.activeScene, 2);
  assert.equal(active.effects.find(e => e.type === 'amp')!.parameters.gain, 13);
});

test('flusso UI completo: modello e stato ON/OFF del blocco vengono copiati, non solo i parametri numerici', () => {
  const { setActivePreset, updateModel, toggleEffect } = usePresetStore.getState();
  setActivePreset({ ...usePresetStore.getState().activePreset, slot: 30, activeScene: 0 });

  const delay = usePresetStore.getState().activePreset.effects.find(e => e.type === 'delay')!;
  const otherModel = MG30_MODELS['delay'].find(m => m.id !== delay.model)!.id;
  updateModel(delay.id, otherModel);
  const noiseGate = usePresetStore.getState().activePreset.effects.find(e => e.type === 'noise-gate')!;
  toggleEffect(noiseGate.id); // inverte lo stato ON/OFF del gate nella scena 0

  const sourceGateEnabled = usePresetStore.getState().activePreset.effects.find(e => e.type === 'noise-gate')!.enabled;

  handleCopyScene(0, 30, 1); // copia scena 0 -> scena 1 dello stesso preset

  const after = usePresetStore.getState().activePreset;
  assert.equal(after.activeScene, 1);
  assert.equal(after.effects.find(e => e.type === 'delay')!.model, otherModel, 'il modello scelto deve essere copiato integralmente');
  assert.equal(after.effects.find(e => e.type === 'noise-gate')!.enabled, sourceGateEnabled, 'lo stato ON/OFF del blocco deve essere copiato integralmente');
});
