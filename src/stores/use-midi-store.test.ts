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

function withModel(type: string, modelId: string) {
  const store = usePresetStore.getState();
  store.setActivePreset({ ...store.activePreset, slot: 122, activeScene: 0 });
  const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === type)!;
  usePresetStore.getState().updateModel(effect.id, modelId);
}

function sentFor(type: string, paramId: string, value: number) {
  const sent = captureSentMessages();
  const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === type)!;
  const index = MG30_MODELS[effect.type].find(m => m.id === effect.model)!.parameters.findIndex(p => p.id === paramId);
  useMidiStore.getState().sendKnobParameter(type, index, value);
  return sent[0];
}

test('tabella QuickTone: le manopole vanno sulla CC della loro posizione sulla pedaliera', () => {
  withModel('amp', 'plexi100w');
  assert.deepEqual(sentFor('amp', 'level', 70), [0xB0, 31, 70], 'Amp Knob 8 = CC 31');
  withModel('amp', 'tweedy');
  assert.deepEqual(sentFor('amp', 'level', 70), [0xB0, 28, 70], 'Tweedy: Level è la manopola 5');
  withModel('compressor', 'kcomp');
  assert.deepEqual(sentFor('compressor', 'level', 40), [0xB0, 15, 40], 'K Comp: Sustain, Level, Clipping');
  withModel('ir', 'ir-sv810');
  assert.deepEqual(sentFor('ir', 'level', 0), [0xB0, 68, 50], 'IR senza microfono: Level resta su CC 68, 0 dB = 50');
  assert.deepEqual(sentFor('ir', 'lowcut', 1000), [0xB0, 69, 100]);
  withModel('eq', 'eq-para');
  assert.deepEqual(sentFor('eq', 'b2freq', 30), [0xB0, 36, 30], 'Para EQ: banda 2 sulla seconda pagina');
  withModel('modulation', 'mod-ce1');
  assert.deepEqual(sentFor('modulation', 'subdiv', 3), [0xB0, 51, 3], 'i selettori inviano l\'indice');
});

test('ON/OFF uguale per tutti i blocchi: modello + 1, +64 in bypass', () => {
  withModel('noise-gate', 'gate');
  const sent = captureSentMessages();
  useMidiStore.getState().toggleBlock('noise-gate', true);
  useMidiStore.getState().toggleBlock('noise-gate', false);
  useMidiStore.getState().toggleBlock('sr', true);
  assert.deepEqual(sent, [[0xB0, 5, 1], [0xB0, 5, 65], [0xB0, 10, 1]]);
});

test('selezionare un blocco usa Current Block (CC 78), non PATCH MIN (CC 75)', () => {
  const sent = captureSentMessages();
  useMidiStore.getState().enterBlockEditor('delay');
  assert.deepEqual(sent, [[0xB0, 78, 7]]);
});

test('i valori in arrivo dopo un cambio preset non vengono scartati', () => {
  captureSentMessages();
  withModel('amp', 'plexi100w');
  useMidiStore.setState({ isEditorSyncing: true, isPushingPreset: false });
  receive(0xB0, 0x18, 33);
  assert.equal(usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!.parameters.gain, 33);
  useMidiStore.setState({ isEditorSyncing: false, isPushingPreset: true });
  receive(0xB0, 0x18, 90);
  assert.equal(usePresetStore.getState().activePreset.effects.find(e => e.type === 'amp')!.parameters.gain, 33, 'ignorato mentre l\'app scrive sulla pedaliera');
  useMidiStore.setState({ isPushingPreset: false });
});

test('addressing a block by its id instead of its type sends nothing', () => {
  const sent = captureSentMessages();
  for (const id of ['ng', 'cmp', 'mod']) {
    useMidiStore.getState().sendKnobParameter(id, 0, 10);
  }
  assert.equal(sent.length, 0);
});
