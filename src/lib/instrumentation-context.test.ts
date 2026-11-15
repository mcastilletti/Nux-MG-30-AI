import assert from 'node:assert/strict';
import test from 'node:test';

import type { Amplifier, Guitar } from '@/types/instrumentation';
import {
  AMPLIFIER_NOT_SET,
  buildInstrumentationContext,
  GUITAR_NOT_SET,
  resolveAmplifier,
  resolveGuitar,
} from './instrumentation-context';

const strat: Guitar = { id: 'g1', model: 'Fender Stratocaster', pickups: [{ id: 'p1', position: 'bridge', type: 'single-coil' }] };
const es335: Guitar = { id: 'g2', model: 'Epiphone ES-335', pickups: [{ id: 'p2', position: 'neck', type: 'humbucker', model: 'Alnico Classic PRO' }] };
const deluxe: Amplifier = { id: 'a1', model: 'Fender Deluxe Reverb', inputPosition: 'before-preamp' };
const frfr: Amplifier = { id: 'a2', model: 'Headrush FRFR 112 MK2', inputPosition: 'frfr-cab' };

test('nessuna scelta: la prima strumentazione inserita, non una predefinita', () => {
  assert.equal(resolveGuitar([strat, es335])?.id, 'g1');
  assert.equal(resolveAmplifier([deluxe, frfr])?.id, 'a1');
});

test('la scelta esplicita vince, e una scelta non più valida torna alla prima', () => {
  assert.equal(resolveGuitar([strat, es335], 'g2')?.id, 'g2');
  assert.equal(resolveAmplifier([deluxe, frfr], 'a2')?.id, 'a2');
  assert.equal(resolveGuitar([strat, es335], 'deleted')?.id, 'g1');
});

test('senza strumentazione inserita l\'AI lo sa e non riceve una chitarra o un ampli inventati', () => {
  assert.equal(resolveGuitar([]), undefined);
  const text = buildInstrumentationContext(undefined, undefined);
  assert.equal(text, `${GUITAR_NOT_SET}\n${AMPLIFIER_NOT_SET}`);
  assert.doesNotMatch(text, /ES-335|FRFR-112|Headrush/);
});

test('una chitarra e un ampli diversi vengono descritti per quello che sono, senza dati altrui', () => {
  const text = buildInstrumentationContext(strat, deluxe);
  assert.equal(text, 'Chitarra: Fender Stratocaster; pickup: ponte single-coil\nAmplificatore: Fender Deluxe Reverb; collegamento: prima del preamplificatore');
  assert.doesNotMatch(text, /ES-335|FRFR|crossover/);
});

test('i modelli di cui l\'app conosce le specifiche le portano con sé', () => {
  const text = buildInstrumentationContext(es335, frfr);
  assert.match(text, /^Chitarra: Epiphone ES-335; pickup: manico humbucker \(Alnico Classic PRO\); dati noti: semi-hollow/);
  assert.match(text, /Amplificatore: Headrush FRFR 112 MK2; collegamento: cassa FRFR; dati noti: cassa attiva full-range.*crossover 2 kHz/);
});
