import assert from 'node:assert/strict';
import test from 'node:test';

import { useMidiStore } from './use-midi-store';
import { usePresetStore } from './use-preset-store';
import { createDefaultEffects } from '@/lib/default-effects';

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

test('addressing a block by its id instead of its type sends nothing', () => {
  const sent = captureSentMessages();
  for (const id of ['ng', 'cmp', 'mod']) {
    useMidiStore.getState().sendKnobParameter(id, 0, 10);
  }
  assert.equal(sent.length, 0);
});

test('PATCH VOL: MIN 0..50 e MAX 50..100 sull\'intera corsa delle due manopole', () => {
  const sent = captureSentMessages();
  const send = (knob: number, value: number) => {
    sent.length = 0;
    useMidiStore.getState().sendKnobParameter('vol', knob, value);
    return sent[0];
  };
  // Manopole al massimo: MIN 50, MAX 100.
  assert.deepEqual(send(0, 50), [0xB0, 75, 127]);
  assert.deepEqual(send(1, 100), [0xB0, 76, 127]);
  // MIN 25: prima manopola a metà. MAX 75: seconda a metà. Minimi a zero.
  assert.deepEqual(send(0, 25), [0xB0, 75, 64]);
  assert.deepEqual(send(1, 75), [0xB0, 76, 64]);
  assert.deepEqual(send(0, 0), [0xB0, 75, 0]);
  assert.deepEqual(send(1, 50), [0xB0, 76, 0]);
});

test('PATCH VOL: i valori letti dalla pedaliera usano la stessa scala', () => {
  captureSentMessages();
  const receive = (cc: number, value: number) =>
    useMidiStore.getState().handleIncomingMidi({ data: new Uint8Array([0xB0, cc, value]) } as unknown as MIDIMessageEvent);
  const vol = () => usePresetStore.getState().activePreset.effects.find((effect) => effect.type === 'vol')!.parameters;
  receive(75, 127); receive(76, 127);
  assert.equal(vol().min, 50);
  assert.equal(vol().max, 100);
  receive(75, 64); receive(76, 0);
  assert.equal(vol().min, 25);
  assert.equal(vol().max, 50);
});

test('PATCH VOL: un preset nuovo parte da MIN 50 e MAX 100', () => {
  const vol = createDefaultEffects().find((effect) => effect.type === 'vol')!;
  assert.deepEqual(vol.parameters, { min: 50, max: 100 });
});
