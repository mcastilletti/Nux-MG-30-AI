import assert from 'node:assert/strict';
import test from 'node:test';

import { useMidiStore } from './use-midi-store';
import { usePresetStore } from './use-preset-store';
import { MG30_MODELS } from '@/lib/mg30-data';

function captureSentMessages() {
  const sent: number[][] = [];
  useMidiStore.setState({ output: { send: (message: number[]) => sent.push(Array.from(message)) } as unknown as MIDIOutput });
  return sent;
}

test('every block with knobs sends a CC when addressed by its type', () => {
  const sent = captureSentMessages();
  const withKnobs = usePresetStore.getState().activePreset.effects.filter(effect => effect.type !== 'sr' && effect.type !== 'vol');

  for (const effect of withKnobs) {
    sent.length = 0;
    useMidiStore.getState().sendKnobParameter(effect.type, 0, 10);
    assert.equal(sent.length, 1, `${effect.type} (id "${effect.id}") non ha inviato nessuna CC`);
    assert.equal(sent[0][0], 0xB0);
  }
});

const receive = (...bytes: number[]) =>
  useMidiStore.getState().handleIncomingMidi({ data: new Uint8Array(bytes) } as MIDIMessageEvent);

test('le manopole 0..100 viaggiano in scala 0..100, come le invia la pedaliera', () => {
  const sent = captureSentMessages();
  useMidiStore.setState({ isEditorSyncing: false });
  usePresetStore.getState().setActivePreset({ ...usePresetStore.getState().activePreset, slot: 120, activeScene: 0 });
  useMidiStore.getState().sendKnobParameter('amp', 0, 50);
  assert.deepEqual(sent[0], [0xB0, 0x18, 50]);

  // Gain al massimo sulla pedaliera arriva come B0 18 64 (100), non 127.
  receive(0xB0, 0x18, 0x64);
  const amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  assert.equal(amp.parameters.gain, 100);
});

test('cattura reale: modello, ON/OFF e parametri dell\'amp letti dalla pedaliera', () => {
  captureSentMessages();
  useMidiStore.setState({ isEditorSyncing: false });
  usePresetStore.getState().setActivePreset({ ...usePresetStore.getState().activePreset, slot: 121, activeScene: 0 });

  receive(0xB0, 0x03, 0x1E);
  for (const [cc, value] of [[0x18, 0x1C], [0x19, 0x35], [0x1A, 0x2D], [0x1B, 0x3D], [0x1C, 0x3D], [0x1D, 0x32]]) {
    receive(0xB0, cc, value);
  }

  const expectedModel = MG30_MODELS.amp[0x1E - 1];
  let amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  assert.equal(amp.model, expectedModel.id);
  assert.equal(amp.enabled, true);
  const params = expectedModel.parameters.map(p => amp.parameters[p.id]);
  assert.deepEqual(params.slice(0, 6), [28, 53, 45, 61, 61, 50]);

  receive(0xB0, 0x03, 0x5E);
  amp = usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!;
  assert.equal(amp.enabled, false);
  assert.equal(amp.model, expectedModel.id);
});

test('addressing a block by its id instead of its type sends nothing', () => {
  const sent = captureSentMessages();
  for (const id of ['ng', 'cmp', 'mod']) {
    useMidiStore.getState().sendKnobParameter(id, 0, 10);
  }
  assert.equal(sent.length, 0);
});
