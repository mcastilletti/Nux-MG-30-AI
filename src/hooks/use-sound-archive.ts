'use client';

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFirebase } from '@/firebase';
import { createSyncedCollection } from '@/hooks/create-synced-collection';
import { parseArchivedSound, sortArchivedSounds, type ArchivedSound } from '@/lib/sound-archive';

export const soundArchive = createSyncedCollection<ArchivedSound>({
  collection: 'soundArchive',
  localKey: 'mg30-sound-archive',
  parse: parseArchivedSound,
});

/** Suoni archiviati (più recenti prima) e azioni legate all'utente corrente. */
export function useSoundArchive() {
  const { firestore, user } = useFirebase();
  const { items, hydrated } = soundArchive.useStore(useShallow((s) => ({ items: s.items, hydrated: s.hydrated })));
  const save = useCallback((sound: ArchivedSound) => soundArchive.save(sound, user ?? null, firestore ?? null), [user, firestore]);
  const remove = useCallback((id: string) => soundArchive.remove(id, user ?? null, firestore ?? null), [user, firestore]);
  return { sounds: sortArchivedSounds(Object.values(items)), hydrated, save, remove, signedIn: !!user };
}
