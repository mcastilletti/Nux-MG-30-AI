'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { collection, deleteDoc, doc, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { emptyLocalState, mergeRemote, type LocalCollectionState, type SyncedItem } from '@/lib/synced-collection';

/** Esito di un salvataggio, come per i preset (use-preset-persistence). */
export type SyncedSaveResult = 'cloud' | 'queued' | 'local' | 'local-error';

/**
 * Collezione dell'utente salvata in `users/{uid}/{collection}` con una copia in localStorage,
 * usata offline e da chi non ha fatto l'accesso. Al login i documenti locali vengono caricati.
 */
export function createSyncedCollection<T extends SyncedItem>(config: {
  collection: string;
  localKey: string;
  parse: (data: unknown) => T | null;
}) {
  const useStore = create<{ items: Record<string, T>; hydrated: boolean }>(() => ({ items: {}, hydrated: false }));

  const readLocal = (): LocalCollectionState<T> => {
    if (typeof window === 'undefined') return emptyLocalState<T>();
    try {
      const raw = JSON.parse(localStorage.getItem(config.localKey) || 'null');
      if (!raw || typeof raw !== 'object') return emptyLocalState<T>();
      const items: Record<string, T> = {};
      for (const value of Object.values((raw as { items?: Record<string, unknown> }).items || {})) {
        const item = config.parse(value);
        if (item) items[item.id] = item;
      }
      const synced = Array.isArray((raw as { synced?: unknown }).synced) ? (raw as { synced: unknown[] }).synced.filter((s): s is string => typeof s === 'string') : [];
      return { items, synced };
    } catch {
      return emptyLocalState<T>();
    }
  };

  const writeLocal = (state: LocalCollectionState<T>) => {
    try {
      localStorage.setItem(config.localKey, JSON.stringify(state));
    } catch { /* spazio esaurito: resta il salvataggio nell'account */ }
    useStore.setState({ items: state.items, hydrated: true });
  };

  /** Da montare una volta (AppShell): carica la copia locale e segue quella nell'account. */
  function useSync() {
    const { firestore, user } = useFirebase();
    useEffect(() => {
      if (!useStore.getState().hydrated) useStore.setState({ items: readLocal().items, hydrated: true });
    }, []);
    useEffect(() => {
      if (!user || !firestore) return;
      const unsub = onSnapshot(
        collection(firestore, 'users', user.uid, config.collection),
        (snap) => {
          const remote = snap.docs.map((d) => config.parse(d.data())).filter((x): x is T => x !== null);
          const { state, upload } = mergeRemote(readLocal(), remote);
          writeLocal(state);
          for (const item of upload) {
            setDoc(doc(firestore, 'users', user.uid, config.collection, item.id), item).catch((err) =>
              console.warn(`[${config.collection}] upload error:`, err),
            );
          }
        },
        (err) => console.warn(`[${config.collection}] Firestore read error:`, err.code),
      );
      return () => unsub();
    }, [user, firestore]);
  }

  async function save(item: T, user: User | null, firestore: Firestore | null): Promise<SyncedSaveResult> {
    const local = readLocal();
    writeLocal({ ...local, items: { ...local.items, [item.id]: item } });
    if (!user || !firestore) return 'local';
    try {
      const outcome = await awaitWrite(setDoc(doc(firestore, 'users', user.uid, config.collection, item.id), item), { online: isOnline() });
      return outcome === 'synced' ? 'cloud' : 'queued';
    } catch (err) {
      console.warn(`[${config.collection}] Firestore write error:`, err);
      return 'local-error';
    }
  }

  async function saveMany(items: T[], user: User | null, firestore: Firestore | null): Promise<SyncedSaveResult[]> {
    return Promise.all(items.map((item) => save(item, user, firestore)));
  }

  async function remove(id: string, user: User | null, firestore: Firestore | null): Promise<SyncedSaveResult> {
    const local = readLocal();
    const items = { ...local.items };
    delete items[id];
    writeLocal({ items, synced: local.synced.filter((s) => s !== id) });
    if (!user || !firestore) return 'local';
    try {
      const outcome = await awaitWrite(deleteDoc(doc(firestore, 'users', user.uid, config.collection, id)), { online: isOnline() });
      return outcome === 'synced' ? 'cloud' : 'queued';
    } catch (err) {
      console.warn(`[${config.collection}] Firestore delete error:`, err);
      return 'local-error';
    }
  }

  /** Al logout: i dati appartengono all'account disconnesso. */
  function clearLocal() {
    try { localStorage.removeItem(config.localKey); } catch { /* ignora */ }
    useStore.setState({ items: {}, hydrated: true });
  }

  return { useStore, useSync, save, saveMany, remove, clearLocal };
}
