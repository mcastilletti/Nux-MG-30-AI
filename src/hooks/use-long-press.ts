'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createLongPress } from './long-press';

/** Gestori per pointer + avanzamento 0..1 da mostrare come anello. */
export function useLongPress(onComplete: () => void, duration = 1000) {
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  const lp = useMemo(() => createLongPress({
    duration,
    onComplete: () => { setProgress(0); callback.current(); },
    timers: { now: () => performance.now(), setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id as number) },
  }), [duration]);

  useEffect(() => () => { lp.cancel(); if (frame.current) cancelAnimationFrame(frame.current); }, [lp]);

  const tick = () => {
    setProgress(lp.progress());
    if (lp.active) frame.current = requestAnimationFrame(tick);
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    lp.start();
    frame.current = requestAnimationFrame(tick);
  };
  const cancel = () => { lp.cancel(); setProgress(0); };

  return {
    progress,
    handlers: { onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel, onContextMenu: (e: React.MouseEvent) => e.preventDefault() },
  };
}
