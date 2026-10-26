'use client';

import { useEffect, useRef } from 'react';
import { useMidiStore } from '@/stores/use-midi-store';
import type { Preset } from '@/types/preset';
import { createDeferredCommit } from './deferred-commit';

const COMMIT_DELAY_MS = 300;

/**
 * Rispecchia il preset in modifica nella libreria `devicePresets` (senza questo,
 * cambiare slot o copiare una scena scarta le modifiche non salvate), ma solo a
 * fine gesto: vedi `createDeferredCommit` (M5).
 */
export function useDeferredPresetCommit(activePreset: Preset) {
  const committerRef = useRef<ReturnType<typeof createDeferredCommit<Preset>> | null>(null);
  if (committerRef.current === null) {
    committerRef.current = createDeferredCommit<Preset>({
      delay: COMMIT_DELAY_MS,
      commit: (preset) => useMidiStore.getState().commitPreset(preset),
      timers: { setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id as number) },
    });
  }

  useEffect(() => {
    committerRef.current!.push(activePreset);
  }, [activePreset]);

  useEffect(() => () => committerRef.current!.flush(), []);
}
