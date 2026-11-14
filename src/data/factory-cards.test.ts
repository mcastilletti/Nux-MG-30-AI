import assert from 'node:assert/strict';
import test from 'node:test';

import { FACTORY_PRESETS } from '@/lib/factory-presets';
import { isGenre, isSoundType } from '@/lib/genres';
import { FACTORY_CARDS } from './factory-cards';

test('ogni preset di fabbrica ha la sua scheda, agganciata al nome di fabbrica', () => {
  assert.equal(FACTORY_PRESETS.length, 128);
  assert.equal(Object.keys(FACTORY_CARDS).length, 128);
  for (const preset of FACTORY_PRESETS) {
    assert.ok(preset.card, `slot ${preset.slot} senza scheda`);
    assert.equal(preset.card.presetName, preset.name, `slot ${preset.slot}: il nome di fabbrica è cambiato`);
  }
});

test('le schede usano solo generi e tipi di suono della lista chiusa, con band e note', () => {
  for (const [slot, card] of Object.entries(FACTORY_CARDS)) {
    assert.ok(isSoundType(card.soundType), `slot ${slot} tipo di suono`);
    assert.ok(card.genres.length >= 1 && card.genres.every(isGenre), `slot ${slot} generi`);
    assert.equal(new Set(card.genres).size, card.genres.length, `slot ${slot} generi duplicati`);
    assert.ok(card.bands.length >= 2 && card.bands.every((b) => b.trim()), `slot ${slot} band`);
    assert.ok(card.notes.length > 20 && card.notes.length <= 300, `slot ${slot} note`);
  }
});

test('i preset adatti a Oasis e all\'alt rock sono segnalati', () => {
  const alt = Object.values(FACTORY_CARDS).filter((c) => c.altRock);
  assert.ok(alt.length >= 15 && alt.length <= 40, `trovati ${alt.length}`);
  assert.ok(alt.every((c) => c.genres.length > 0));
});
