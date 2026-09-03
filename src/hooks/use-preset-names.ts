'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { usePresetStore } from '@/stores/use-preset-store';

/** Record<slot, name> — slot è 1-indexed (1..128) */
export type PresetNamesMap = Record<number, string>;

const LS_KEY = 'nux-mg30-preset-names';

function loadFromLocalStorage(): PresetNamesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Converti le chiavi in numeri
    const result: PresetNamesMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const slot = parseInt(k, 10);
      if (!isNaN(slot) && typeof v === 'string') result[slot] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function persistToLocalStorage(names: PresetNamesMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(names));
  } catch { /* quota exceeded, ignora */ }
}

/**
 * Legge i nomi dei preset da Firestore (se loggato) o da localStorage.
 * Li scrive su entrambi quando l'utente rinomina uno slot.
 *
 * Path Firestore: users/{uid}/settings/presetNames
 * Struttura documento: { slot_1: "Nome", slot_2: "Altro", ... }
 */
export function usePresetNames() {
  const { firestore, user } = useFirebase();
  const [savedNames, setSavedNames] = useState<PresetNamesMap>(loadFromLocalStorage);
  const [isLoading, setIsLoading] = useState(false);

  // Mantiene il nome del preset attivo allineato alla cache condivisa dei nomi.
  useEffect(() => {
    const activePreset = usePresetStore.getState().activePreset;
    const savedName = savedNames[activePreset.slot];
    if (savedName && savedName !== activePreset.name) {
      usePresetStore.setState(state => ({
        activePreset: { ...state.activePreset, name: savedName },
      }));
    }
  }, [savedNames]);

  // Sottoscrizione real-time a Firestore quando l'utente è loggato
  useEffect(() => {
    if (!user || !firestore) {
      // Non loggato: usa solo localStorage (già caricato nello state iniziale)
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const docRef = doc(firestore, 'users', user.uid, 'settings', 'presetNames');

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const names: PresetNamesMap = {};
          for (const [key, value] of Object.entries(data)) {
            const match = key.match(/^slot_(\d+)$/);
            if (match && typeof value === 'string' && value.trim().length > 0) {
              names[parseInt(match[1], 10)] = value.trim();
            }
          }
          setSavedNames(names);
          persistToLocalStorage(names); // tieni localStorage sincronizzato come cache offline
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('[usePresetNames] Firestore read error:', err.code);
        setIsLoading(false);
        // Fallback: resta con i dati di localStorage già nello state
      }
    );

    return () => unsub();
  }, [user, firestore]);

  /**
   * Salva il nome di uno slot sia in memoria, sia in localStorage, sia su Firestore.
   * La UI si aggiorna immediatamente (optimistic update).
   */
  const savePresetName = useCallback(
    (slot: number, name: string) => {
      const trimmed = name.trim();

      setSavedNames((prev) => {
        const next = { ...prev, [slot]: trimmed };
        persistToLocalStorage(next);
        return next;
      });

      if (user && firestore) {
        const docRef = doc(firestore, 'users', user.uid, 'settings', 'presetNames');
        setDoc(docRef, { [`slot_${slot}`]: trimmed }, { merge: true }).catch((err) => {
          console.warn('[usePresetNames] Firestore write error:', err.code);
        });
      }
    },
    [user, firestore]
  );

  return { savedNames, savePresetName, isLoading };
}
