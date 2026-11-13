'use client';

import { useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { createSyncedCollection } from '@/hooks/create-synced-collection';
import { parseFactoryNote, type FactoryPresetNote } from '@/lib/factory-notes';

export const factoryNotes = createSyncedCollection<FactoryPresetNote>({
  collection: 'factoryNotes',
  localKey: 'mg30-factory-notes',
  parse: parseFactoryNote,
});

/** Schede AI dei preset di fabbrica, per slot. */
export function useFactoryNotes() {
  const { firestore, user } = useFirebase();
  const items = factoryNotes.useStore((s) => s.items);
  const hydrated = factoryNotes.useStore((s) => s.hydrated);
  const saveMany = useCallback((notes: FactoryPresetNote[]) => factoryNotes.saveMany(notes, user ?? null, firestore ?? null), [user, firestore]);
  return { notesBySlot: items, hydrated, saveMany };
}
