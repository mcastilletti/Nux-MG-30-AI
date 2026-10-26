/**
 * Pressione prolungata (spec V6): completa dopo `duration` ms senza rilascio.
 * I timer sono iniettabili per i test.
 */
export interface LongPressTimers {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

export function createLongPress({ duration, onComplete, timers }: { duration: number; onComplete: () => void; timers: LongPressTimers }) {
  let startedAt: number | null = null;
  let timer: unknown = null;
  return {
    start() {
      if (startedAt !== null) return;
      startedAt = timers.now();
      timer = timers.setTimeout(() => { startedAt = null; timer = null; onComplete(); }, duration);
    },
    cancel() {
      if (timer !== null) timers.clearTimeout(timer);
      startedAt = null; timer = null;
    },
    /** 0..1, per l'anello di avanzamento. */
    progress(): number {
      if (startedAt === null) return 0;
      return Math.min(1, (timers.now() - startedAt) / duration);
    },
    get active() { return startedAt !== null; },
  };
}
