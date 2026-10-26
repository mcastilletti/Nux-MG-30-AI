/** Inserisce `item` in `list` alla posizione `index` (limitata ai bordi). */
export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
  return next;
}

/** Rimuove l'elemento in `index`; restituisce la nuova lista e cosa serve per annullare. */
export function removeAt<T>(list: readonly T[], index: number): { list: T[]; removed: T | undefined; index: number } {
  const next = [...list];
  const [removed] = next.splice(index, 1);
  return { list: next, removed, index };
}

/**
 * Punto di inserimento per scelte fatte in sequenza dallo stesso selettore (M1/NT11):
 * la n-esima scelta va dopo le precedenti, non tutte nello stesso punto.
 */
export const sequentialIndex = (startIndex: number, picksSoFar: number) => startIndex + picksSoFar;

export const isNewline = (chord: string) => chord.trim().toUpperCase() === 'NEWLINE';

/** Punto "+" visibile in modifica: alla fine di ogni riga (prima del suo a capo). */
export interface InsertSlot { index: number; line: number }

/**
 * Punti di inserimento di una sezione, uno per riga: le righe sono separate
 * da "NEWLINE". Per l'inizio o il mezzo di una riga c'è il menu dell'accordo
 * ("Inserisci prima…", "Inserisci dopo…").
 */
export function insertionSlots(chords: readonly string[]): InsertSlot[] {
  const slots: InsertSlot[] = [];
  chords.forEach((chord, i) => { if (isNewline(chord)) slots.push({ index: i, line: slots.length }); });
  slots.push({ index: chords.length, line: slots.length });
  return slots;
}
