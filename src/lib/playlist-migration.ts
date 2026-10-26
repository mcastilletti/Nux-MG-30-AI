import type { NoteSection, SavedNote } from '@/types/note';
import type { Band, PlaylistItem } from '@/types/playlist';

/**
 * Piano della conversione dal modello vecchio (band/scaletta/ordine dentro ogni
 * nota) al serbatoio con playlist (spec `docs/spec-playlist.md` §3).
 * Funzione pura: non scrive nulla. Nessuna nota viene cancellata o modificata
 * nel contenuto; i duplicati ricevono solo `mergedInto`.
 */

export interface ExistingSetlist {
  id: string;
  name: string;
  bandId: string;
  items?: PlaylistItem[];
}

export interface PlannedBand { key: string; name: string; existingId?: string }

export interface PlannedPlaylist {
  key: string;
  name: string;
  bandKey: string;
  existingId?: string;
  items: PlaylistItem[];
}

export interface MigrationPlan {
  /** Band da creare (quelle esistenti hanno `existingId`). */
  bands: PlannedBand[];
  playlists: PlannedPlaylist[];
  merges: { noteId: string; mergedInto: string }[];
  summary: {
    notes: number;
    pool: number;
    merged: number;
    playlists: number;
    playlistsCreated: number;
    bandsCreated: number;
    /** Note che restano solo nel serbatoio (senza scaletta). */
    unassigned: number;
  };
}

const NO_BAND = 'senza band';
const NO_SETLIST = 'senza scaletta';
export const DEFAULT_BAND_NAME = 'Senza band';

/** Nome leggibile: spazi superflui tolti (P5). */
export const cleanName = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');
/** Chiave di confronto per band e scalette: senza spazi superflui e senza maiuscole. */
export const nameKey = (value: unknown) => cleanName(value).toLocaleLowerCase('it');

const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '');

/** Impronta del contenuto: uguale per i duplicati da unire (preset escluso, P4). */
export function contentFingerprint(note: SavedNote): string {
  const sections = (note.sections ?? []).map((section: NoteSection) => ({
    type: section.type ?? '',
    text: text(section.text),
    chords: section.chords ?? [],
  }));
  return JSON.stringify([
    nameKey(note.title),
    note.type === 'block' ? 'block' : 'song',
    sections,
    text(note.blockContent),
    text(note.generalNotes),
  ]);
}

const timeOf = (value: unknown): number => {
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return 0;
};

const presetOf = (note: SavedNote) => ({ slot: note.presetSlot ?? '', scene: note.presetSlot ? note.presetScene ?? '' : '' });

export function planPlaylistMigration({ notes, bands, setlists }: {
  notes: SavedNote[];
  bands: Pick<Band, 'id' | 'name'>[];
  setlists: ExistingSetlist[];
}): MigrationPlan {
  // 1. Duplicati: per ogni impronta resta la nota modificata più di recente.
  const groups = new Map<string, SavedNote[]>();
  for (const note of notes) {
    const key = contentFingerprint(note);
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }
  const canonicalOf = new Map<string, SavedNote>();
  const merges: MigrationPlan['merges'] = [];
  for (const group of groups.values()) {
    const keeper = [...group].sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt) || a.id.localeCompare(b.id))[0];
    for (const note of group) {
      canonicalOf.set(note.id, keeper);
      if (note.id !== keeper.id) merges.push({ noteId: note.id, mergedInto: keeper.id });
    }
  }

  // 2. Band: esistenti per nome normalizzato, poi quelle usate nelle note.
  const plannedBands = new Map<string, PlannedBand>();
  for (const band of bands) {
    const key = nameKey(band.name);
    if (key && !plannedBands.has(key)) plannedBands.set(key, { key, name: cleanName(band.name), existingId: band.id });
  }
  const bandKeyById = new Map(bands.map((band) => [band.id, nameKey(band.name)]));
  const ensureBand = (rawName: unknown) => {
    const key = nameKey(rawName);
    const resolved = !key || key === NO_BAND ? nameKey(DEFAULT_BAND_NAME) : key;
    if (!plannedBands.has(resolved)) {
      plannedBands.set(resolved, { key: resolved, name: !key || key === NO_BAND ? DEFAULT_BAND_NAME : cleanName(rawName) });
    }
    return resolved;
  };

  // 3. Playlist: scalette esistenti (anche vuote), poi le coppie band/scaletta delle note.
  const playlists = new Map<string, PlannedPlaylist>();
  const playlistKey = (bandKey: string, setlistName: unknown) => `${bandKey}\u0000${nameKey(setlistName)}`;
  for (const setlist of setlists) {
    const bandKey = bandKeyById.get(setlist.bandId);
    if (!bandKey || !nameKey(setlist.name)) continue;
    const key = playlistKey(bandKey, setlist.name);
    if (!playlists.has(key)) playlists.set(key, { key, name: cleanName(setlist.name), bandKey, existingId: setlist.id, items: [] });
  }

  const byPlaylist = new Map<string, SavedNote[]>();
  let unassigned = 0;
  for (const note of notes) {
    const setlistKey = nameKey(note.setlist);
    if (!setlistKey || setlistKey === NO_SETLIST) { unassigned++; continue; }
    const bandKey = ensureBand(note.band);
    const key = playlistKey(bandKey, note.setlist);
    if (!playlists.has(key)) playlists.set(key, { key, name: cleanName(note.setlist), bandKey, items: [] });
    byPlaylist.set(key, [...(byPlaylist.get(key) ?? []), note]);
  }

  for (const [key, members] of byPlaylist) {
    const ordered = [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.title || '').localeCompare(b.title || '', 'it'));
    const items: PlaylistItem[] = [];
    const seen = new Set<string>();
    for (const original of ordered) {
      const keeper = canonicalOf.get(original.id)!;
      if (seen.has(keeper.id)) continue;
      seen.add(keeper.id);
      const item: PlaylistItem = { noteId: keeper.id };
      const mine = presetOf(original);
      const theirs = presetOf(keeper);
      // La playlist conserva il preset della sua copia se diverso dal predefinito del brano (P4).
      if (mine.slot !== theirs.slot || mine.scene !== theirs.scene) {
        item.presetSlot = mine.slot;
        if (mine.slot && mine.scene) item.presetScene = mine.scene;
      }
      items.push(item);
    }
    playlists.get(key)!.items = items;
  }

  const plannedPlaylists = [...playlists.values()];
  const plannedBandList = [...plannedBands.values()].filter((band) => band.existingId || plannedPlaylists.some((p) => p.bandKey === band.key));
  return {
    bands: plannedBandList,
    playlists: plannedPlaylists,
    merges,
    summary: {
      notes: notes.length,
      pool: notes.length - merges.length,
      merged: merges.length,
      playlists: plannedPlaylists.length,
      playlistsCreated: plannedPlaylists.filter((p) => !p.existingId).length,
      bandsCreated: plannedBandList.filter((b) => !b.existingId).length,
      unassigned,
    },
  };
}
