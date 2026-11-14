import { isGenre, isSoundType, type Genre, type SoundType } from '@/lib/genres';

/**
 * Scheda di un preset di fabbrica generata dall'AI. Salvata in `users/{uid}/factoryNotes/slot_N`
 * e in localStorage `mg30-factory-notes`.
 */
export interface FactoryPresetNote {
  id: string;
  slot: number;
  soundType: SoundType;
  genres: Genre[];
  notes: string;
  updatedAt: string;
}

export const factoryNoteId = (slot: number) => `slot_${slot}`;

export function parseFactoryNote(data: unknown): FactoryPresetNote | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.slot !== 'number' || !Number.isInteger(d.slot) || d.slot < 1 || d.slot > 128) return null;
  if (!isSoundType(d.soundType)) return null;
  const genres = Array.isArray(d.genres) ? d.genres.filter(isGenre) : [];
  return {
    id: factoryNoteId(d.slot),
    slot: d.slot,
    soundType: d.soundType,
    genres: [...new Set(genres)],
    notes: typeof d.notes === 'string' ? d.notes.slice(0, 600) : '',
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date(0).toISOString(),
  };
}

/** Slot ancora senza scheda, divisi in lotti per le chiamate AI. */
export function pendingFactoryBatches(allSlots: number[], done: Set<number>, size = 8): number[][] {
  const pending = allSlots.filter((s) => !done.has(s));
  const batches: number[][] = [];
  for (let i = 0; i < pending.length; i += size) batches.push(pending.slice(i, i + size));
  return batches;
}
