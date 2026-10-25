import assert from 'node:assert/strict';
import test from 'node:test';

import { getPresetSendCommands, readAutoSendSetting } from './preset-send';

test('slot valido con scena', () => {
  assert.deepEqual(getPresetSendCommands({ presetSlot: '12', presetScene: '2' }), { program: 11, scene: 2 });
  assert.deepEqual(getPresetSendCommands({ presetSlot: '1', presetScene: '0' }), { program: 0, scene: 0 });
});

test('scena vuota o non valida: solo Program Change', () => {
  assert.deepEqual(getPresetSendCommands({ presetSlot: '5', presetScene: '' }), { program: 4, scene: null });
  assert.deepEqual(getPresetSendCommands({ presetSlot: '5' }), { program: 4, scene: null });
  assert.deepEqual(getPresetSendCommands({ presetSlot: '5', presetScene: '7' }), { program: 4, scene: null });
});

test('slot assente o fuori intervallo: nessun comando', () => {
  assert.equal(getPresetSendCommands({ presetSlot: '' }), null);
  assert.equal(getPresetSendCommands({ presetSlot: '0' }), null);
  assert.equal(getPresetSendCommands({ presetSlot: '129' }), null);
  assert.equal(getPresetSendCommands({ presetSlot: 'abc' }), null);
});

test('impostazione invio automatico', () => {
  assert.equal(readAutoSendSetting(null), true);
  assert.equal(readAutoSendSetting({ getItem: () => null }), true);
  assert.equal(readAutoSendSetting({ getItem: () => 'off' }), false);
  assert.equal(readAutoSendSetting({ getItem: () => { throw new Error('blocked'); } }), true);
});

test('etichetta del preset: stato e testo', async () => {
  const { getPresetChipState, formatPresetLabel } = await import('./preset-send');
  assert.deepEqual(getPresetChipState({ connected: false, sent: true }), { text: 'non collegata', tone: 'muted' });
  assert.deepEqual(getPresetChipState({ connected: true, sent: true }), { text: 'inviato', tone: 'success' });
  assert.equal(getPresetChipState({ connected: true, sent: false }).text, 'tocca per inviare');
  assert.equal(formatPresetLabel('03B', '1'), '03B · S2');
  assert.equal(formatPresetLabel('03B', ''), '03B');
  assert.equal(formatPresetLabel('03B', '9'), '03B');
});
