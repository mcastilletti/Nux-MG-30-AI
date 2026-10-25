import assert from 'node:assert/strict';
import test from 'node:test';

import type { Amplifier, Guitar } from '@/types/instrumentation';
import {
  buildInstrumentationContext,
  DEFAULT_AMPLIFIER_DESCRIPTION,
  DEFAULT_GUITAR_DESCRIPTION,
  resolveAmplifier,
  resolveGuitar,
} from './instrumentation-context';

const strat: Guitar = { id: 'g1', model: 'Fender Stratocaster', pickups: [{ id: 'p1', position: 'bridge', type: 'single-coil' }] };
const es335: Guitar = { id: 'g2', model: 'Epiphone ES-335', pickups: [{ id: 'p2', position: 'neck', type: 'humbucker', model: 'Alnico Classic PRO' }] };
const deluxe: Amplifier = { id: 'a1', model: 'Fender Deluxe Reverb', inputPosition: 'before-preamp' };
const frfr: Amplifier = { id: 'a2', model: 'Headrush FRFR 112 MK2', inputPosition: 'frfr-cab' };

test('defaults to the saved ES-335 and FRFR-112 when nothing is selected', () => {
  assert.equal(resolveGuitar([strat, es335])?.id, 'g2');
  assert.equal(resolveAmplifier([deluxe, frfr])?.id, 'a2');
});

test('an explicit selection always wins over the default', () => {
  assert.equal(resolveGuitar([strat, es335], 'g1')?.id, 'g1');
  assert.equal(resolveAmplifier([deluxe, frfr], 'a1')?.id, 'a1');
});

test('a stale selection falls back to the default', () => {
  assert.equal(resolveGuitar([strat, es335], 'deleted')?.id, 'g2');
});

test('uses the documented ES-335 and FRFR-112 specs when no instrument is available', () => {
  assert.equal(resolveGuitar([strat]), undefined);
  assert.equal(
    buildInstrumentationContext(undefined, undefined),
    `${DEFAULT_GUITAR_DESCRIPTION}\n${DEFAULT_AMPLIFIER_DESCRIPTION}`,
  );
});

test('describes the user instruments', () => {
  assert.equal(
    buildInstrumentationContext(es335, frfr),
    'Chitarra: Epiphone ES-335; pickup: manico humbucker (Alnico Classic PRO)\nAmplificatore: Headrush FRFR 112 MK2; collegamento: cassa FRFR',
  );
});
