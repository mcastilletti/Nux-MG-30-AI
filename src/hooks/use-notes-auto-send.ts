'use client';

import { useCallback, useEffect, useState } from 'react';
import { NOTES_AUTO_SEND_KEY, readAutoSendSetting } from '@/components/notes/preset-send';

const CHANGE_EVENT = 'mg30:notes-auto-send-change';

/** Invio automatico del preset all'apertura di un brano: preferenza per dispositivo. */
export function useNotesAutoSend(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(readAutoSendSetting(typeof window === 'undefined' ? null : window.localStorage));
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(NOTES_AUTO_SEND_KEY, value ? 'on' : 'off');
    } catch { /* ignora */ }
    setEnabled(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, update];
}
