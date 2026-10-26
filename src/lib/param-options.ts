/**
 * Parametri con valori a nome (es. microfono, posizione, Sub Div): il valore
 * MIDI è `min + indice` nell'elenco `options` di `mg30-data.ts`.
 */

/** Fino a 4 valori: pulsanti tutti visibili (un tocco). Oltre: menu a tendina. */
export const optionControlKind = (count: number): 'buttons' | 'select' => (count <= 4 ? 'buttons' : 'select');

/** Indice del valore nell'elenco; -1 se fuori elenco (es. preset importato non valido). */
export function optionIndexOf(value: number, min: number, count: number): number {
  const index = Math.round(value) - min;
  return index >= 0 && index < count ? index : -1;
}
