/**
 * Serializzazione stabile della bozza di una nota, usata per capire se ci sono
 * modifiche non salvate rispetto all'ultimo caricamento o salvataggio.
 */
export function serializeDraft(draft: Record<string, unknown>): string {
  return JSON.stringify(draft, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, (value as Record<string, unknown>)[key]]))
      : value,
  );
}
