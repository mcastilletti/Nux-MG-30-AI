import type { SavedNote } from '@/types/note';
import type { Band, Playlist } from '@/types/playlist';
import { isVisibleNote } from './playlist-ops';

/** Viste della pagina Note nel modello a playlist (spec PL1–PL7). */

export type PoolTypeFilter = 'all' | 'song' | 'block';

const normalize = (value: string) => value.toLocaleLowerCase('it').normalize('NFD').replace(/\p{Diacritic}/gu, '');
export const matchesQuery = (note: SavedNote, query: string) => !query.trim() || normalize(note.title || '').includes(normalize(query.trim()));
const byTitle = (a: SavedNote, b: SavedNote) => (a.title || '').localeCompare(b.title || '', 'it', { sensitivity: 'base', numeric: true });

/** Serbatoio (PL1): brani e blocchi visibili in ordine alfabetico, con ricerca e filtro per tipo. */
export function poolNotes(notes: SavedNote[], { query = '', type = 'all' }: { query?: string; type?: PoolTypeFilter } = {}): SavedNote[] {
  return notes
    .filter(isVisibleNote)
    .filter((note) => type === 'all' || (type === 'block' ? note.type === 'block' : note.type !== 'block'))
    .filter((note) => matchesQuery(note, query))
    .sort(byTitle);
}

export interface PlaylistLabel { id: string; name: string; bandName: string }

/** Playlist che contengono il brano, ordinate per band e nome (chip PL1, avviso PL8). */
export function playlistLabelsFor(noteId: string, playlists: Playlist[], bands: Band[]): PlaylistLabel[] {
  const bandName = new Map(bands.map((band) => [band.id, band.name]));
  return playlists
    .filter((playlist) => playlist.items.some((item) => item.noteId === noteId))
    .map((playlist) => ({ id: playlist.id, name: playlist.name, bandName: bandName.get(playlist.bandId) ?? '' }))
    .sort((a, b) => a.bandName.localeCompare(b.bandName, 'it') || a.name.localeCompare(b.name, 'it'));
}

/** Chip mostrati nella riga: al massimo `max`, il resto come "+N". */
export function chipSummary(labels: PlaylistLabel[], max = 2): { shown: PlaylistLabel[]; more: number } {
  return { shown: labels.slice(0, max), more: Math.max(0, labels.length - max) };
}

export interface PlaylistGroup { band: Band | null; bandName: string; playlists: Playlist[] }

/** Playlist raggruppate per band (dialogo "Aggiungi a playlist…", PL6, e filtro). */
export function groupPlaylistsByBand(playlists: Playlist[], bands: Band[]): PlaylistGroup[] {
  const groups = new Map<string, PlaylistGroup>();
  for (const band of bands) groups.set(band.id, { band, bandName: band.name, playlists: [] });
  for (const playlist of playlists) {
    if (!groups.has(playlist.bandId)) groups.set(playlist.bandId, { band: null, bandName: 'Senza band', playlists: [] });
    groups.get(playlist.bandId)!.playlists.push(playlist);
  }
  return [...groups.values()]
    .filter((group) => group.playlists.length > 0)
    .map((group) => ({ ...group, playlists: [...group.playlists].sort((a, b) => a.name.localeCompare(b.name, 'it')) }))
    .sort((a, b) => a.bandName.localeCompare(b.bandName, 'it'));
}

/** Titolo della nuova versione (PL7): "Titolo (versione 2)", poi 3, 4… senza doppioni. */
export function nextVersionTitle(title: string, existingTitles: string[]): string {
  const base = title.replace(/\s*\(versione \d+\)\s*$/i, '').trim() || 'Senza titolo';
  const taken = new Set(existingTitles.map((t) => normalize(t.trim())));
  for (let n = 2; ; n++) {
    const candidate = `${base} (versione ${n})`;
    if (!taken.has(normalize(candidate))) return candidate;
  }
}

/** Dati della nuova versione: stesso contenuto e preset predefinito, nessuna playlist. */
export function buildVersionNote(note: SavedNote, title: string): Omit<SavedNote, 'id'> {
  const { id: _id, mergedInto: _merged, updatedAt: _updated, order: _order, ...rest } = note;
  return {
    ...rest,
    title,
    band: '',
    setlist: '',
    sections: (note.sections ?? []).map((section, i) => ({ ...section, id: `version-${Date.now()}-${i}`, chords: [...(section.chords ?? [])] })),
  };
}
