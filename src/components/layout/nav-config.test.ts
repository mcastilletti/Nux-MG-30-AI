import assert from 'node:assert/strict';
import test from 'node:test';

import { MOBILE_BAR, MOBILE_MORE, NAV_ENTRIES, SIDEBAR_GROUPS, getActiveNavKey, getRouteTitle, isMoreActive } from './nav-config';

test('titoli di tutte le pagine, Settings compresa (N2)', () => {
  assert.equal(getRouteTitle('/'), 'Home');
  assert.equal(getRouteTitle('/settings'), 'Impostazioni');
  assert.equal(getRouteTitle('/tools/sysex-analyzer'), 'SysEx Analyzer');
  assert.equal(getRouteTitle('/notes/editor'), 'Note');
  assert.equal(getRouteTitle('/sconosciuta'), 'MG30 Studio');
});

test('ogni sezione raggiungibile in al massimo 2 tocchi su mobile', () => {
  const reachable = new Set([...MOBILE_BAR, ...MOBILE_MORE]);
  assert.deepEqual([...reachable].sort(), Object.keys(NAV_ENTRIES).sort());
  assert.equal(MOBILE_BAR.length + 1, 5); // 4 voci + Altro
});

test('ogni sezione presente una sola volta nella sidebar', () => {
  const keys = SIDEBAR_GROUPS.flatMap((g) => g.keys);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual([...keys].sort(), Object.keys(NAV_ENTRIES).sort());
});

test('voce attiva e Altro', () => {
  assert.equal(getActiveNavKey('/notes'), 'notes');
  assert.equal(isMoreActive('/settings'), true);
  assert.equal(isMoreActive('/'), true);
  assert.equal(isMoreActive('/editor'), false);
});
