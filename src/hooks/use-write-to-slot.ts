'use client';

import { useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { savePresetToStorage, type PresetSaveResult } from '@/hooks/use-preset-persistence';
import { soundArchive } from '@/hooks/use-sound-archive';
import type { SyncedSaveResult } from '@/hooks/create-synced-collection';
import { createArchivedSound } from '@/lib/sound-archive';
import { mergeSceneIntoPreset } from '@/lib/scene-merge';
import type { Preset } from '@/types/preset';

export interface WriteToSlotResult {
  saved: PresetSaveResult;
  /** Esito dell'archiviazione del suono sostituito, se richiesta. */
  archived: SyncedSaveResult | null;
  /** 'sent': scritto sulla pedaliera; 'offline': pedaliera non collegata; 'busy': invio già in corso. */
  pedal: 'sent' | 'offline' | 'busy';
  /** Scena (1-3) scritta sulla pedaliera. */
  scene: number;
}

/**
 * Scrive un preset in uno slot: archivia (se richiesto) il suono che c'era, aggiorna libreria e
 * salvataggi, poi lo invia alla pedaliera con la stessa sequenza dell'editor (Program Change verso
 * lo slot, poi scena e parametri). Sulla pedaliera arriva la scena attiva del preset.
 *
 * Con `scene` si scrive una sola scena: la scena `from` del suono va nella scena `to` dello slot, che
 * tiene le altre due scene e il nome; sulla pedaliera si seleziona `to` e si scrive solo quella.
 */
export function useWriteToSlot(savePresetName: (slot: number, name: string) => void) {
  const { firestore, user } = useFirebase();

  return useCallback(async ({ preset, slot, archiveCurrent, currentName, scene }: {
    preset: Preset;
    slot: number;
    archiveCurrent: boolean;
    /** Solo una scena: da quale scena del suono (0-2) a quale scena dello slot (0-2). */
    scene?: { from: number; to: number };
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

    let destination: Preset;
    if (scene && current) {
      // Nome (quello mostrato in libreria) e altre scene restano quelli dello slot: si cambia solo la scena di arrivo.
      destination = mergeSceneIntoPreset({ ...current, slot, name: currentName }, preset, scene.from, scene.to);
    } else {
      destination = { ...preset, slot, activeScene: 0, lastModified: new Date() };
      if (destination.scenes?.[0]) destination.effects = destination.scenes[0].map((e) => ({ ...e, parameters: { ...e.parameters } }));
    }
    const sceneIndex = scene && current ? scene.to : 0;
    midi.commitPreset(destination);
    if (!(scene && current)) savePresetName(slot, destination.name);
    if (usePresetStore.getState().activePreset.slot === slot) {
      usePresetStore.setState({ activePreset: destination, history: [destination], historyIndex: 0 });
    }
    const saved = await savePresetToStorage(destination, user ?? null, firestore ?? null);

    const state = useMidiStore.getState();
    if (state.status !== 'connected') return { saved, archived, pedal: 'offline', scene: sceneIndex + 1 };
    if (state.isEditorSyncing) return { saved, archived, pedal: 'busy', scene: sceneIndex + 1 };
    // skipAutoSync: senza, syncActivePreset bloccherebbe per 2 s la syncFullPreset qui sotto.
    state.sendProgramChange(slot - 1, true);
    setTimeout(() => {
      const s = useMidiStore.getState();
      s.sendSceneChange(sceneIndex);
      s.syncFullPreset(destination);
    }, 300);
    return { saved, archived, pedal: 'sent', scene: sceneIndex + 1 };
  }, [user, firestore, savePresetName]);
}
