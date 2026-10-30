import type { SavedNote } from '@/types/note';
import type { Playlist, PlaylistItem } from '@/types/playlist';

/**
 * Operazioni pure sulle playlist (spec `docs/spec-playlist.md`).
 * Ogni funzione restituisce una nuova playlist e non modifica l'originale.
 */

/** Una nota unita a un'altra dalla migrazione (`mergedInto`) è nascosta ovunque. */
export const isVisibleNote = (note: SavedNote) => !note.mergedInto;

/** Segue `mergedInto` fino alla nota visibile (al massimo pochi passi; si ferma sui cicli). */
export function resolveNoteId(noteId: string, notesById: Map<string, SavedNote>): string | null {
  let current = notesById.get(noteId);
  const seen = new Set<string>();
  while (current?.mergedInto && !seen.has(current.id)) {
    seen.add(current.id);
    current = notesById.get(current.mergedInto);
  }
  return current && isVisibleNote(current) ? current.id : null;
}

export const indexNotes = (notes: SavedNote[]) => new Map(notes.map((note) => [note.id, note]));

/** Aggiunge i brani in coda, saltando quelli già presenti. */
export function addNotes(playlist: Playlist, noteIds: string[]): Playlist {
  const present = new Set(playlist.items.map((item) => item.noteId));
  const added: PlaylistItem[] = [];
  for (const noteId of noteIds) {
    if (present.has(noteId)) continue;
    present.add(noteId);
    added.push({ noteId });
  }
  return added.length ? { ...playlist, items: [...playlist.items, ...added] } : playlist;
}

/** Toglie un brano; restituisce anche l'elemento e la posizione, per "Annulla" (PL4). */
export function removeNote(playlist: Playlist, noteId: string): { playlist: Playlist; removed: { item: PlaylistItem; index: number } | null } {
  const index = playlist.items.findIndex((item) => item.noteId === noteId);
  if (index < 0) return { playlist, removed: null };
  const items = playlist.items.filter((_, i) => i !== index);
  return { playlist: { ...playlist, items }, removed: { item: playlist.items[index], index } };
}

/** Rimette un elemento tolto nella sua posizione (Annulla). */
export function restoreItem(playlist: Playlist, item: PlaylistItem, index: number): Playlist {
  if (playlist.items.some((existing) => existing.noteId === item.noteId)) return playlist;
  const items = [...playlist.items];
  items.splice(Math.min(Math.max(index, 0), items.length), 0, item);
  return { ...playlist, items };
}

export function moveItem(playlist: Playlist, fromIndex: number, toIndex: number): Playlist {
  const n = playlist.items.length;
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n) return playlist;
  const items = [...playlist.items];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return { ...playlist, items };
}

/** Sostituisce un brano con un altro (es. una versione, PL7) nella stessa posizione, conservando il preset proprio. */
export function replaceNote(playlist: Playlist, oldNoteId: string, newNoteId: string): Playlist {
  const index = playlist.items.findIndex((item) => item.noteId === oldNoteId);
  if (index < 0 || oldNoteId === newNoteId) return playlist;
  if (playlist.items.some((item) => item.noteId === newNoteId)) {
    // Il nuovo brano c'è già: basta togliere il vecchio.
    return removeNote(playlist, oldNoteId).playlist;
  }
  const items = playlist.items.map((item, i) => (i === index ? { ...item, noteId: newNoteId } : item));
  return { ...playlist, items };
}

/**
 * Preset proprio della playlist per un brano (P4, PL12):
 * `null` = usa il predefinito del brano; `''` = nessun preset in questa playlist.
 */
export function setItemPreset(playlist: Playlist, noteId: string, presetSlot: string | null, presetScene?: string): Playlist {
  const index = playlist.items.findIndex((item) => item.noteId === noteId);
  if (index < 0) return playlist;
  const items = playlist.items.map((item, i) => {
    if (i !== index) return item;
    const next: PlaylistItem = { noteId: item.noteId };
    if (presetSlot !== null) {
      next.presetSlot = presetSlot;
      if (presetSlot && presetScene) next.presetScene = presetScene;
    }
    return next;
  });
  return { ...playlist, items };
}

export interface EffectivePreset {
  presetSlot: string;
  presetScene: string;
  /** `playlist`: preset proprio della playlist (anche "nessuno"); `note`: predefinito del brano. */
  source: 'playlist' | 'note';
}

/** Preset da usare per chip, ▶, invio automatico e Live: quello della playlist se impostato, altrimenti quello del brano. */
export function effectivePreset(note: Pick<SavedNote, 'presetSlot' | 'presetScene'>, item?: PlaylistItem | null): EffectivePreset {
  if (item && item.presetSlot !== undefined) {
    return { presetSlot: item.presetSlot, presetScene: item.presetSlot ? item.presetScene ?? '' : '', source: 'playlist' };
  }
  // Una scena senza slot non manda nulla alla pedaliera (getPresetSendCommands): la si considera vuota.
  return { presetSlot: note.presetSlot ?? '', presetScene: note.presetSlot ? note.presetScene ?? '' : '', source: 'note' };
}

export const findItem = (playlist: Playlist | null | undefined, noteId: string | null | undefined) =>
  (playlist && noteId ? playlist.items.find((item) => item.noteId === noteId) ?? null : null);

export const playlistsContaining = (playlists: Playlist[], noteId: string) =>
  playlists.filter((playlist) => playlist.items.some((item) => item.noteId === noteId));

/** Toglie un brano da tutte le playlist (eliminazione, PL5): restituisce solo le playlist cambiate. */
export function removeNoteFromAll(playlists: Playlist[], noteId: string): Playlist[] {
  return playlists
    .filter((playlist) => playlist.items.some((item) => item.noteId === noteId))
    .map((playlist) => removeNote(playlist, noteId).playlist);
}

export interface PlaylistEntry {
  note: SavedNote;
  item: PlaylistItem;
  /** Posizione 1..N nell'ordine della playlist. */
  position: number;
}

/** Brani della playlist nell'ordine, risolvendo i duplicati uniti e saltando quelli mancanti. */
export function playlistEntries(playlist: Playlist, notesById: Map<string, SavedNote>): PlaylistEntry[] {
  const entries: PlaylistEntry[] = [];
  const seen = new Set<string>();
  for (const item of playlist.items) {
    const id = resolveNoteId(item.noteId, notesById);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    entries.push({ note: notesById.get(id)!, item, position: entries.length + 1 });
  }
  return entries;
}

export interface PlaylistPosition {
  index: number;
  total: number;
  previous: SavedNote | null;
  next: SavedNote | null;
}

/** Posizione del brano nella playlist da cui è stato aperto (PL10): Prec/Succ e `n / N`. */
export function getPlaylistPosition(playlist: Playlist | null | undefined, notesById: Map<string, SavedNote>, noteId: string | null): PlaylistPosition | null {
  if (!playlist || !noteId) return null;
  const entries = playlistEntries(playlist, notesById);
  const i = entries.findIndex((entry) => entry.note.id === noteId);
  if (i < 0) return null;
  return {
    index: i + 1,
    total: entries.length,
    previous: entries[i - 1]?.note ?? null,
    next: entries[i + 1]?.note ?? null,
  };
}

/** Brani della playlist in ordine alfabetico, per la scelta libera (V11). */
export function getPlaylistAlphabetical(playlist: Playlist | null | undefined, notesById: Map<string, SavedNote>, noteId: string | null) {
  if (!playlist) return [];
  return playlistEntries(playlist, notesById)
    .map((entry) => ({ note: entry.note, position: entry.position, isCurrent: entry.note.id === noteId }))
    .sort((a, b) => (a.note.title || '').localeCompare(b.note.title || '', 'it', { sensitivity: 'base', numeric: true }));
}

const byTitle = (a: { note: SavedNote }, b: { note: SavedNote }) =>
  (a.note.title || '').localeCompare(b.note.title || '', 'it', { sensitivity: 'base', numeric: true });

/**
 * Tutti i brani delle playlist della stessa band, in ordine alfabetico e senza doppioni (V11):
 * dal vivo si può suonare anche un brano di un'altra scaletta. `position` è la posizione nella
 * playlist corrente, null se il brano non ne fa parte.
 */
export function getBandAlphabetical(playlists: Playlist[], playlist: Playlist | null | undefined, notesById: Map<string, SavedNote>, noteId: string | null) {
  if (!playlist) return [];
  const positions = new Map(playlistEntries(playlist, notesById).map((entry) => [entry.note.id, entry.position]));
  const notes = new Map<string, SavedNote>();
  for (const p of playlists) {
    if (p.bandId !== playlist.bandId) continue;
    for (const entry of playlistEntries(p, notesById)) notes.set(entry.note.id, entry.note);
  }
  return [...notes.values()]
    .map((note) => ({ note, position: positions.get(note.id) ?? null, isCurrent: note.id === noteId }))
    .sort(byTitle);
}

/**
 * Brano aperto dall'elenco della band ma fuori dalla playlist corrente: la playlist resta quella
 * di partenza, Prec torna al brano da cui si è saltati (`anchorId`) e Succ prosegue la scaletta da lì.
 */
export function getOutsidePlaylistPosition(playlist: Playlist | null | undefined, notesById: Map<string, SavedNote>, anchorId: string | null): PlaylistPosition | null {
  const anchor = getPlaylistPosition(playlist, notesById, anchorId);
  if (!anchor || !anchorId) return null;
  return { index: anchor.index, total: anchor.total, previous: notesById.get(anchorId) ?? null, next: anchor.next };
}

/** Come la playlist usa il preset del brano (PL12): predefinito, proprio o nessuno. */
export type ItemPresetMode = 'default' | 'custom' | 'none';

export function itemPresetMode(item: PlaylistItem | null | undefined): ItemPresetMode {
  if (!item || item.presetSlot === undefined) return 'default';
  return item.presetSlot === '' ? 'none' : 'custom';
}

/** Valore per `setItemPreset` a partire dalla scelta nel foglio. */
export function presetSlotForMode(mode: ItemPresetMode, slot: string): string | null {
  if (mode === 'default') return null;
  if (mode === 'none') return '';
  return slot || null;
}

export type PresetFields = { mode: ItemPresetMode; slot: string; scene: string };

/**
 * Campi preset mostrati nel foglio: dalla playlist il preset proprio
 * dell'elemento, altrimenti il predefinito del brano.
 */
export function presetFieldsFor(
  note: Pick<SavedNote, 'presetSlot' | 'presetScene'>,
  item: PlaylistItem | null | undefined,
): PresetFields {
  if (!item) return { mode: 'default', slot: note.presetSlot || '', scene: note.presetScene || '' };
  const mode = itemPresetMode(item);
  return mode === 'custom'
    ? { mode, slot: item.presetSlot ?? '', scene: item.presetScene ?? '' }
    : { mode, slot: '', scene: '' };
}
