export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/** Testo dello stato di salvataggio; null quando non c'è nulla da dire. */
export function getSaveStatusLabel(state: SaveState): string | null {
  switch (state) {
    case 'dirty': return 'Modifiche non salvate';
    case 'saving': return 'Salvataggio…';
    case 'saved': return 'Salvato';
    case 'error': return 'Salvataggio non riuscito';
    default: return null;
  }
}
