'use client';

import { useCallback, useEffect, useState } from 'react';

/** Preferenza on/off per dispositivo in localStorage, condivisa tra componenti. */
export function useLocalFlag(key: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const event = `mg30:flag:${key}`;
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(key);
        setValue(raw === null ? defaultValue : raw === 'on');
      } catch { setValue(defaultValue); }
    };
    sync();
    window.addEventListener(event, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(event, sync); window.removeEventListener('storage', sync); };
  }, [key, defaultValue, event]);

  const update = useCallback((next: boolean) => {
    try { window.localStorage.setItem(key, next ? 'on' : 'off'); } catch { /* ignora */ }
    setValue(next);
    window.dispatchEvent(new Event(event));
  }, [key, event]);

  return [value, update];
}
