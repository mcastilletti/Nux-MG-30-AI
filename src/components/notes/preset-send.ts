/**
 * Comandi MIDI per richiamare il preset collegato a una nota (audit D2, NT4).
 * Slot 1..128 → Program Change 0..127; scena 0..2 oppure nessuna.
 * Una scena vuota o non valida non produce comandi (prima inviava NaN).
 */
export function getPresetSendCommands({ presetSlot, presetScene }: {
  presetSlot?: string | null;
  presetScene?: string | null;
}): { program: number; scene: number | null } | null {
  const slot = Number(presetSlot);
  if (!presetSlot || !Number.isInteger(slot) || slot < 1 || slot > 128) return null;
  const scene = presetScene === undefined || presetScene === null || presetScene === '' ? NaN : Number(presetScene);
  return { program: slot - 1, scene: Number.isInteger(scene) && scene >= 0 && scene <= 2 ? scene : null };
}

export const NOTES_AUTO_SEND_KEY = 'mg30-notes-auto-send';

/** Preferenza del dispositivo: attiva se non è mai stata spenta. */
export function readAutoSendSetting(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(NOTES_AUTO_SEND_KEY) !== 'off';
  } catch {
    return true;
  }
}



export type PresetChipTone = 'success' | 'muted';

/** Testo dell'etichetta del preset sotto il titolo (spec L4): l'invio MIDI non è mai silenzioso. */
export function getPresetChipState({ connected, sent }: { connected: boolean; sent: boolean }): { text: string; tone: PresetChipTone } {
  if (!connected) return { text: 'non collegata', tone: 'muted' };
  return sent ? { text: 'inviato', tone: 'success' } : { text: 'tocca per inviare', tone: 'muted' };
}

/** Etichetta breve del preset collegato: "03B · S2" (scena facoltativa). */
export function formatPresetLabel(slotLabel: string, presetScene?: string | null): string {
  const scene = presetScene === undefined || presetScene === null || presetScene === '' ? NaN : Number(presetScene);
  return Number.isInteger(scene) && scene >= 0 && scene <= 2 ? `${slotLabel} · S${scene + 1}` : slotLabel;
}
