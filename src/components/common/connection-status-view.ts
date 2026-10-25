export type MidiStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionStatusView {
  label: string;
  tone: 'success' | 'warning' | 'muted' | 'destructive';
  /** Spiegazione per tooltip e lettori di schermo. */
  detail: string;
}

/** Testo e colore dello stato MIDI (audit E8/H2: errori e "connessione" erano invisibili). */
export function getConnectionStatusView(status: MidiStatus | string, lastError?: string | null): ConnectionStatusView {
  switch (status) {
    case 'connected':
      return { label: 'MG-30 collegata', tone: 'success', detail: 'La pedaliera è collegata via USB MIDI.' };
    case 'connecting':
      return { label: 'Connessione…', tone: 'warning', detail: 'Ricerca della pedaliera in corso.' };
    case 'error':
      return {
        label: 'Errore MIDI',
        tone: 'destructive',
        detail: lastError
          ? `${lastError}. Usa Chrome o Edge su computer o Android e consenti l'accesso MIDI.`
          : "Accesso MIDI non riuscito. Usa Chrome o Edge su computer o Android e consenti l'accesso MIDI.",
      };
    default:
      return { label: 'MG-30 non collegata', tone: 'muted', detail: 'Collega la pedaliera via USB: verrà rilevata automaticamente.' };
  }
}
