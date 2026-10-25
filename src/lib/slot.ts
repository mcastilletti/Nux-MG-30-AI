/** Slot della MG-30: 1..128, mostrati come banco (01–32) + lettera (A–D). */
export function formatSlotLabel(slot: number): string {
  const bank = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(bank).padStart(2, '0')}${letter}`;
}

/** Ricerca di un preset per etichetta ("2b", "02b") o per nome. `search` va passato in minuscolo. */
export function matchesSlotSearch(preset: { slot: number; name: string }, search: string): boolean {
  const full = formatSlotLabel(preset.slot).toLowerCase();
  const short = full.replace(/^0/, '');
  return short.includes(search) || full.includes(search) || preset.name.toLowerCase().includes(search);
}
