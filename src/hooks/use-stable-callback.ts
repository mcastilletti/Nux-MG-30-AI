'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Callback con identità stabile che chiama sempre l'ultima versione della
 * funzione: permette ai componenti memoizzati (catena, manopole) di non
 * ridisegnarsi solo perché il genitore ha ricreato i gestori.
 * Da usare per gestori di eventi, non durante il render.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}
