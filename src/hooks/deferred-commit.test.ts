import assert from 'node:assert/strict';
import test from 'node:test';

import { createDeferredCommit } from './deferred-commit';

function fakeTimers() {
  let t = 0; const queue: { at: number; fn: () => void; id: number }[] = []; let next = 1;
  return {
    timers: {
      setTimeout: (fn: () => void, ms: number) => { const id = next++; queue.push({ at: t + ms, fn, id }); return id; },
      clearTimeout: (id: unknown) => { const i = queue.findIndex((q) => q.id === id); if (i >= 0) queue.splice(i, 1); },
    },
    advance(ms: number) { t += ms; for (const q of [...queue].filter((q) => q.at <= t)) { queue.splice(queue.indexOf(q), 1); q.fn(); } },
  };
}

type P = { slot: number; gain: number };

test('durante un gesto esegue un solo commit, con il valore finale', () => {
  const f = fakeTimers(); const commits: P[] = [];
  const dc = createDeferredCommit<P>({ delay: 300, commit: (p) => commits.push(p), timers: f.timers });
  for (let g = 1; g <= 20; g++) { dc.push({ slot: 1, gain: g }); f.advance(16); }
  assert.equal(commits.length, 0);
  f.advance(300);
  assert.deepEqual(commits, [{ slot: 1, gain: 20 }]);
});

test('al cambio di slot il preset precedente viene salvato subito', () => {
  const f = fakeTimers(); const commits: P[] = [];
  const dc = createDeferredCommit<P>({ delay: 300, commit: (p) => commits.push(p), timers: f.timers });
  dc.push({ slot: 1, gain: 7 });
  dc.push({ slot: 2, gain: 0 });
  assert.deepEqual(commits, [{ slot: 1, gain: 7 }]);
  f.advance(300);
  assert.deepEqual(commits, [{ slot: 1, gain: 7 }, { slot: 2, gain: 0 }]);
});

test('flush salva subito il valore in sospeso e non lo ripete', () => {
  const f = fakeTimers(); const commits: P[] = [];
  const dc = createDeferredCommit<P>({ delay: 300, commit: (p) => commits.push(p), timers: f.timers });
  dc.push({ slot: 3, gain: 5 });
  dc.flush();
  assert.deepEqual(commits, [{ slot: 3, gain: 5 }]);
  f.advance(1000);
  dc.flush();
  assert.equal(commits.length, 1);
});
