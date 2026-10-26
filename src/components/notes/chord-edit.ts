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
