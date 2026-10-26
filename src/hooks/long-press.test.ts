import assert from 'node:assert/strict';
import test from 'node:test';

import { createLongPress } from './long-press';

function fakeTimers() {
  let t = 0; const queue: { at: number; fn: () => void; id: number }[] = []; let next = 1;
  return {
    timers: {
      now: () => t,
      setTimeout: (fn: () => void, ms: number) => { const id = next++; queue.push({ at: t + ms, fn, id }); return id; },
      clearTimeout: (id: unknown) => { const i = queue.findIndex((q) => q.id === id); if (i >= 0) queue.splice(i, 1); },
    },
    advance(ms: number) { t += ms; for (const q of [...queue].filter((q) => q.at <= t)) { queue.splice(queue.indexOf(q), 1); q.fn(); } },
  };
}

test('completa solo dopo la durata intera', () => {
  const f = fakeTimers(); let done = 0;
  const lp = createLongPress({ duration: 1000, onComplete: () => done++, timers: f.timers });
  lp.start(); f.advance(600);
  assert.equal(done, 0); assert.equal(lp.progress(), 0.6);
  f.advance(400);
  assert.equal(done, 1); assert.equal(lp.active, false);
});

test('rilascio anticipato: nessun effetto (tocco singolo non sblocca)', () => {
  const f = fakeTimers(); let done = 0;
  const lp = createLongPress({ duration: 1000, onComplete: () => done++, timers: f.timers });
  lp.start(); f.advance(300); lp.cancel(); f.advance(2000);
  assert.equal(done, 0); assert.equal(lp.progress(), 0);
});

test('start ripetuto non riparte da zero', () => {
  const f = fakeTimers(); let done = 0;
  const lp = createLongPress({ duration: 1000, onComplete: () => done++, timers: f.timers });
  lp.start(); f.advance(500); lp.start(); f.advance(500);
  assert.equal(done, 1);
});
