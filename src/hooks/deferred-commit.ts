/**
 * Commit differito del preset in modifica nella libreria (M5).
 *
 * Durante un gesto (trascinamento di una manopola) il preset cambia a ogni frame:
 * copiarlo ogni volta nei 128 preset della libreria è inutile. Il commit parte
 * `delay` ms dopo l'ultima modifica, subito quando cambia lo slot (il preset
 * precedente non va mai perso) e con `flush()` allo smontaggio.
 * I timer sono iniettabili per i test.
 */
export interface DeferredCommitTimers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

export function createDeferredCommit<T extends { slot: number }>({ delay, commit, timers }: {
  delay: number;
  commit: (value: T) => void;
  timers: DeferredCommitTimers;
}) {
  let pending: T | null = null;
  let timer: unknown = null;

  const flush = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
    if (pending === null) return;
    const value = pending;
    pending = null;
    commit(value);
  };

  return {
    push(value: T) {
      if (pending !== null && pending.slot !== value.slot) flush();
      pending = value;
      if (timer !== null) timers.clearTimeout(timer);
      timer = timers.setTimeout(flush, delay);
    },
    flush,
  };
}
