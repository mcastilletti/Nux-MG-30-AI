'use client';

import { useCallback, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { INITIAL_PRESETS, useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { fromPresetDoc, presetDocId, toPresetDoc, type PresetDoc } from '@/lib/preset-storage';
import type { Preset } from '@/types/preset';

/**
 * Salvataggio dei preset (audit D1).
 * - Cache locale `mg30-saved-presets`: { [slot]: PresetDoc }, usata offline e da non loggati.
 * - Firestore `users/{uid}/presets/slot_{n}` per chi ha fatto l'accesso.
 * Ogni versione salvata viene applicata una sola volta per sessione, così una
 * modifica non ancora salvata non viene sovrascritta cambiando pagina.
 */
const LS_KEY = 'mg30-saved-presets';
const SAVE_TIMEOUT_MS = 8000;

type LocalCache = Record<string, PresetDoc>;

/** slot → lastModified (ISO) della versione già applicata in questa sessione. */
const appliedVersions = new Map<number, string>();
let localHydrated = false;

function readLocal(): LocalCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(cache: LocalCache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch { /* spazio esaurito: resta il salvataggio cloud */ }
}

/** Applica i preset salvati alla libreria e, se possibile, al preset in modifica. */
function applyPresets(presets: Preset[]) {
  const fresh = presets.filter((p) => appliedVersions.get(p.slot) !== new Date(p.lastModified).toISOString());
  if (!fresh.length) return;
  for (const p of fresh) appliedVersions.set(p.slot, new Date(p.lastModified).toISOString());

  const bySlot = new Map(fresh.map((p) => [p.slot, p]));
  useMidiStore.setState((state) => ({
    devicePresets: state.devicePresets.map((p) => bySlot.get(p.slot) ?? p),
  }));

  const { activePreset, history } = usePresetStore.getState();
  const saved = bySlot.get(activePreset.slot);
  // Con modifiche in corso (cronologia oltre la prima voce) non si tocca l'editor.
  if (saved && history.length <= 1) {
    usePresetStore.setState({ activePreset: saved, history: [saved], historyIndex: 0 });
  }
}

function parseCache(cache: LocalCache): Preset[] {
  return Object.values(cache).map(fromPresetDoc).filter((p): p is Preset => p !== null);
}

export type PresetSaveResult = 'cloud' | 'queued' | 'local' | 'local-error';

export async function savePresetToStorage(preset: Preset, user: User | null, firestore: Firestore | null): Promise<PresetSaveResult> {
  const record = toPresetDoc({ ...preset, lastModified: new Date() });
  const cache = readLocal();
  cache[String(record.slot)] = record;
  writeLocal(cache);
  appliedVersions.set(record.slot, record.lastModified);

  if (!user || !firestore) return 'local';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // Firestore mette in coda la scrittura e la invia al ritorno della rete.
    setDoc(doc(firestore, 'users', user.uid, 'presets', record.id), record).catch(() => {});
    return 'queued';
  }
  try {
    const write = setDoc(doc(firestore, 'users', user.uid, 'presets', record.id), record);
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), SAVE_TIMEOUT_MS));
    const outcome = await Promise.race([write.then(() => 'ok' as const), timeout]);
    return outcome === 'ok' ? 'cloud' : 'queued';
  } catch (err) {
    console.warn('[presets] Firestore write error:', err);
    return 'local-error';
  }
}

/** Al logout: i preset salvati appartengono all'account disconnesso. */
export function clearSavedPresets() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignora */ }
  appliedVersions.clear();
  useMidiStore.setState({ devicePresets: INITIAL_PRESETS });
  const slot = usePresetStore.getState().activePreset.slot;
  const reset = INITIAL_PRESETS.find((p) => p.slot === slot) ?? INITIAL_PRESETS[0];
  usePresetStore.setState({ activePreset: reset, history: [reset], historyIndex: 0 });
}

/** Da montare una volta per pagina (AppShell): carica i preset salvati. */
export function usePresetPersistence() {
  const { firestore, user } = useFirebase();

  useEffect(() => {
    if (localHydrated) return;
    localHydrated = true;
    applyPresets(parseCache(readLocal()));
  }, []);

  useEffect(() => {
    if (!user || !firestore) return;
    const unsub = onSnapshot(
      collection(firestore, 'users', user.uid, 'presets'),
      (snap) => {
        const cache = readLocal();
        const cloudSlots = new Set<string>();
        const toApply: Preset[] = [];
        for (const d of snap.docs) {
          const preset = fromPresetDoc(d.data());
          if (!preset) continue;
          const key = String(preset.slot);
          cloudSlots.add(key);
          const local = cache[key];
          const cloudTime = new Date(preset.lastModified).getTime();
          if (local && Date.parse(local.lastModified) > cloudTime) continue; // la copia locale è più recente
          cache[key] = toPresetDoc(preset);
          toApply.push(preset);
        }
        // Preset salvati su questo dispositivo prima dell'accesso, o più recenti del cloud: li carica nell'account.
        for (const [key, local] of Object.entries(cache)) {
          const remoteDoc = snap.docs.find((d) => d.id === presetDocId(Number(key)));
          const remoteTime = remoteDoc ? Date.parse(String(remoteDoc.data().lastModified)) : NaN;
          if (!cloudSlots.has(key) || Date.parse(local.lastModified) > remoteTime) {
            setDoc(doc(firestore, 'users', user.uid, 'presets', local.id), local).catch((err) =>
              console.warn('[presets] upload error:', err),
            );
          }
        }
        writeLocal(cache);
        applyPresets(toApply);
      },
      (err) => console.warn('[presets] Firestore read error:', err.code),
    );
    return () => unsub();
  }, [user, firestore]);
}

/** Restituisce la funzione di salvataggio legata all'utente corrente. */
export function useSavePreset() {
  const { firestore, user } = useFirebase();
  return useCallback((preset: Preset) => savePresetToStorage(preset, user ?? null, firestore ?? null), [user, firestore]);
}
