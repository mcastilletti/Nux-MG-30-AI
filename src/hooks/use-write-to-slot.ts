'use client';

import { useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { savePresetToStorage, type PresetSaveResult } from '@/hooks/use-preset-persistence';
import { soundArchive } from '@/hooks/use-sound-archive';
import type { SyncedSaveResult } from '@/hooks/create-synced-collection';
import { createArchivedSound } from '@/lib/sound-archive';
import type { Preset } from '@/types/preset';

export interface WriteToSlotResult {
  saved: PresetSaveResult;
  /** Esito dell'archiviazione del suono sostituito, se richiesta. */
  archived: SyncedSaveResult | null;
  /** 'sent': scritto sulla pedaliera; 'offline': pedaliera non collegata; 'busy': invio già in corso. */
  pedal: 'sent' | 'offline' | 'busy';
}

/**
 * Scrive un preset in uno slot: archivia (se richiesto) il suono che c'era, aggiorna libreria e
 * salvataggi, poi lo invia alla pedaliera con la stessa sequenza dell'editor (Program Change verso
 * lo slot, poi scena e parametri). Sulla pedaliera arriva la scena attiva del preset.
 */
export function useWriteToSlot(savePresetName: (slot: number, name: string) => void) {
  const { firestore, user } = useFirebase();

  return useCallback(async ({ preset, slot, archiveCurrent, currentName }: {
    preset: Preset;
    slot: number;
    archiveCurrent: boolean;
    /** Nome mostrato in libreria per il suono attuale dello slot. */
    currentName: string;
  }): Promise<WriteToSlotResult> => {
    const midi = useMidiStore.getState();
    const current = midi.devicePresets.find((p) => p.slot === slot);

    let archived: SyncedSaveResult | null = null;
    if (archiveCurrent && current) {
      const sound = createArchivedSound({ ...current, name: currentName }, 'slot', { originSlot: slot });
      archived = await soundArchive.save(sound, user ?? null, firestore ?? null);
    }

    const destination: Preset = { ...preset, slot, activeScene: 0, lastModified: new Date() };
    if (destination.scenes?.[0]) destination.effects = destination.scenes[0].map((e) => ({ ...e, parameters: { ...e.parameters } }));
    midi.commitPreset(destination);
    savePresetName(slot, destination.name);
    if (usePresetStore.getState().activePreset.slot === slot) {
      usePresetStore.setState({ activePreset: destination, history: [destination], historyIndex: 0 });
    }
    const saved = await savePresetToStorage(destination, user ?? null, firestore ?? null);

    const state = useMidiStore.getState();
    if (state.status !== 'connected') return { saved, archived, pedal: 'offline' };
    if (state.isEditorSyncing) return { saved, archived, pedal: 'busy' };
    // skipAutoSync: senza, syncActivePreset bloccherebbe per 2 s la syncFullPreset qui sotto.
    state.sendProgramChange(slot - 1, true);
    setTimeout(() => {
      const s = useMidiStore.getState();
      s.sendSceneChange(0);
      s.syncFullPreset(destination);
    }, 300);
    return { saved, archived, pedal: 'sent' };
  }, [user, firestore, savePresetName]);
}
