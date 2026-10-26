import { create } from 'zustand';

/**
 * Registro dei messaggi MIDI (pagina Impostazioni), separato dallo store della
 * pedaliera (M4): ogni messaggio aggiorna solo chi legge il registro, non
 * l'editor né la cornice dell'app.
 */
interface MidiLogStore {
  midiLog: string[];
  midiOutLog: string[];
  addMidiLog: (msg: string) => void;
  addMidiOutLog: (msg: string) => void;
  clearMidiLog: () => void;
  clearMidiOutLog: () => void;
}

const MAX_ENTRIES = 200;

export const useMidiLogStore = create<MidiLogStore>((set) => ({
  midiLog: [],
  midiOutLog: [],
  addMidiLog: (msg) => set((state) => ({ midiLog: [msg, ...state.midiLog].slice(0, MAX_ENTRIES) })),
  addMidiOutLog: (msg) => set((state) => ({ midiOutLog: [msg, ...state.midiOutLog].slice(0, MAX_ENTRIES) })),
  clearMidiLog: () => set({ midiLog: [] }),
  clearMidiOutLog: () => set({ midiOutLog: [] }),
}));

/** Log di diagnostica del flusso MIDI: solo in sviluppo, mai in produzione (M6). */
export const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};
