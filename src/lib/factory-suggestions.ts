import type { FactoryCard } from '@/data/factory-cards';
import { FACTORY_PRESETS } from '@/lib/factory-presets';
import { isGenre, type Genre } from '@/lib/genres';
import type { SavedNote } from '@/types/note';

/**
 * Preset di fabbrica consigliati per un genere: quelli che nella loro scheda elencano il genere,
 * dal più pertinente (genere più in alto nella scheda), a parità di posizione per numero di slot.
 * Restituisce al massimo `limit` slot; se ce ne sono meno, tutti quelli disponibili.
 */
export function suggestFactoryPresets(genre: string | undefined, limit = 3): number[] {
  if (!isGenre(genre)) return [];
  return FACTORY_PRESETS
    .map((p) => ({ slot: p.slot, rank: p.card.genres.indexOf(genre), alt: p.card.altRock }))
    .filter((c) => c.rank !== -1)
    // Per i generi vicini ai gusti dell'utente (Britpop, alternative) i preset segnati con la stella vengono prima.
    .sort((a, b) => a.rank - b.rank || Number(b.alt) - Number(a.alt) || a.slot - b.slot)
    .slice(0, limit)
    .map((c) => c.slot);
}

/** Brani visibili (non blocchi, non uniti in un altro) con genere fra quelli della scheda. */
export function songsForFactoryCard(card: FactoryCard | undefined, songs: SavedNote[]): SavedNote[] {
  if (!card) return [];
  const genres = new Set<Genre>(card.genres);
  return songs
    .filter((s) => s.type !== 'block' && !s.mergedInto && isGenre(s.genre) && genres.has(s.genre))
    .sort((a, b) => a.title.localeCompare(b.title, 'it'));
}

/** Brani a cui manca il genere (da stimare con l'AI). */
export const songsWithoutGenre = (songs: SavedNote[]) =>
  songs.filter((s) => s.type !== 'block' && !s.mergedInto && !isGenre(s.genre) && s.title.trim());
