import assert from 'node:assert/strict';
import test from 'node:test';

import { MG30_MODELS } from './mg30-data';
import { FACTORY_PRESETS, describeFactoryPreset, getFactoryPreset } from './factory-presets';
import { parseFactoryNote, pendingFactoryBatches } from './factory-notes';

test('descrizione per l\'AI: blocchi accesi in ordine di catena, selettori con il nome', () => {
  const text = describeFactoryPreset(getFactoryPreset(18)!, MG30_MODELS);
  assert.match(text, /^Slot 18 "VT Clean Chorus"\./);
  assert.match(text, /modulation TC CHORUS \(SPEED 31, WIDTH 65, CH\/FL CHORUS, INTENSITY 32, Sub Div 1\/4\)/);
  assert.doesNotMatch(text, /\bvol\b/);
  assert.match(describeFactoryPreset(getFactoryPreset(1)!, MG30_MODELS), /IR utente: CHPBOGIE212/);
  for (const p of FACTORY_PRESETS) assert.ok(describeFactoryPreset(p, MG30_MODELS).length < 1500, `slot ${p.slot}`);
});

test('schede: generi fuori lista scartati, slot non validi rifiutati', () => {
  const note = parseFactoryNote({ slot: 3, soundType: 'Clean', genres: ['Pop', 'Vaporwave', 'Pop'], notes: 'Pulito.', updatedAt: '2026-11-13T00:00:00Z' });
  assert.deepEqual(note, { id: 'slot_3', slot: 3, soundType: 'Clean', genres: ['Pop'], notes: 'Pulito.', updatedAt: '2026-11-13T00:00:00Z' });
  assert.equal(parseFactoryNote({ slot: 0, soundType: 'Clean' }), null);
  assert.equal(parseFactoryNote({ slot: 3, soundType: 'Boh' }), null);
});

test('lotti da 8 solo per gli slot mancanti', () => {
  const all = Array.from({ length: 128 }, (_, i) => i + 1);
  assert.equal(pendingFactoryBatches(all, new Set()).length, 16);
  assert.ok(pendingFactoryBatches(all, new Set()).every((b) => b.length === 8));
  const batches = pendingFactoryBatches(all, new Set(all.slice(0, 120)));
  assert.deepEqual(batches, [[121, 122, 123, 124, 125, 126, 127, 128]]);
});
