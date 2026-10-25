'use client';

import { useCallback, useEffect, useState } from 'react';
import { NOTE_TEXT_SCALE_KEY, parseTextScale } from '@/components/notes/note-text-scale';

const CHANGE_EVENT = 'mg30:notes-text-scale-change';

/** Scala del testo delle Note, per dispositivo, condivisa tra foglio e menu. */
export function useNoteTextScale(): [number, (scale: number) => void] {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const sync = () => {
      try { setScale(parseTextScale(window.localStorage.getItem(NOTE_TEXT_SCALE_KEY))); } catch { setScale(1); }
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback((value: number) => {
    try { window.localStorage.setItem(NOTE_TEXT_SCALE_KEY, String(value)); } catch { /* ignora */ }
    setScale(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [scale, update];
}
