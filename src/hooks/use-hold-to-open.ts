import { useCallback, useRef } from 'react';

const HOLD_MS = 450;
const MOVE_TOLERANCE_PX = 10;

/**
 * Pressione prolungata per aprire un menu con tocco o penna (non col mouse). `onLongPress` parte dopo ~450 ms se il dito
 * non si sposta; il tocco che segue non deve aprire nulla: `consumeClick()` dice se va ignorato.
 * Il menu contestuale nativo (selezione testo, anteprima) viene soppresso sul tocco prolungato.
 */
export function useHoldToOpen(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        timer.current = null;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
        onLongPress();
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Su touch il menu nativo si sovrappone al nostro.
      if ((e.nativeEvent as PointerEvent).pointerType !== 'mouse') e.preventDefault();
    },
  };

  /** Vero una sola volta dopo una pressione prolungata: il `click` che ne segue va ignorato. */
  const consumeClick = useCallback(() => {
    const was = fired.current;
    fired.current = false;
    return was;
  }, []);

  return { handlers, consumeClick };
}
