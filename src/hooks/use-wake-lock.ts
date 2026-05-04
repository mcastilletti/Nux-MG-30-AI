
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const requestWakeLock = useCallback(async () => {
    // Evitiamo richieste se già attivo o non supportato
    if (wakeLockRef.current || !('wakeLock' in navigator)) return;

    try {
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsLocked(true);
      
      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsLocked(false);
      });

    } catch (err: any) {
      // Silenzioso in produzione, solo warning in dev
      if (process.env.NODE_ENV === 'development') {
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock is disallowed by permissions policy.');
        } else {
          console.warn(`WakeLock: ${err.name}: ${err.message}`);
        }
      }
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLockRef.current === null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  return isLocked;
};
