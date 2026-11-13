import type { FactoryPresetNote } from '@/lib/factory-notes';
import { isGenre, type Genre } from '@/lib/genres';
import type { SavedNote } from '@/types/note';

/**
 * Preset di fabbrica consigliati per un genere: quelli che nella loro scheda AI elencano il genere,
 * dal più pertinente (genere più in alto nella scheda), a parità di posizione per numero di slot.
 * Restituisce al massimo `limit` slot; se ce ne sono meno, tutti quelli disponibili.
 */
export function suggestFactoryPresets(genre: string | undefined, notes: Iterable<FactoryPresetNote>, limit = 3): number[] {
  if (!isGenre(genre)) return [];
  return [...notes]
    .map((note) => ({ slot: note.slot, rank: note.genres.indexOf(genre) }))
    .filter((c) => c.rank !== -1)
    .sort((a, b) => a.rank - b.rank || a.slot - b.slot)
    .slice(0, limit)
    .map((c) => c.slot);
}

/** Brani visibili (non blocchi, non uniti in un altro) con genere fra quelli della scheda. */
export function songsForFactoryNote(note: FactoryPresetNote | undefined, songs: SavedNote[]): SavedNote[] {
  if (!note) return [];
  const genres = new Set<Genre>(note.genres);
  return songs
    .filter((s) => s.type !== 'block' && !s.mergedInto && isGenre(s.genre) && genres.has(s.genre))
    .sort((a, b) => a.title.localeCompare(b.title, 'it'));
}

/** Brani a cui manca il genere (da stimare con l'AI). */
export const songsWithoutGenre = (songs: SavedNote[]) =>
  songs.filter((s) => s.type !== 'block' && !s.mergedInto && !isGenre(s.genre) && s.title.trim());
