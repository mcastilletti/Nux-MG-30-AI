import assert from 'node:assert/strict';
import test from 'node:test';

import { useMidiStore } from './use-midi-store';
import { usePresetStore } from './use-preset-store';

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
