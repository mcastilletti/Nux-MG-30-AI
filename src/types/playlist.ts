/**
 * Modello a playlist (spec `docs/spec-playlist.md`): i brani stanno in un
 * serbatoio unico (`notes`), le playlist (documenti `setlists`) ne elencano
 * l'ordine e possono impostare un preset proprio per ogni brano (P4).
 */
export interface Band {
  id: string;
  name: string;
  userId: string;
  logoUrl?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlaylistItem {
  noteId: string;
  /**
   * Preset proprio della playlist (P4): assente = preset predefinito del brano;
   * stringa vuota = nessun preset in questa playlist.
   */
  presetSlot?: string;
  presetScene?: string;
}

export interface Playlist {
  id: string;
  name: string;
  bandId: string;
  userId: string;
  /** Ordine della playlist; un brano compare al massimo una volta. */
  items: PlaylistItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Marcatore della conversione, in `users/{uid}/settings/notesModel`. */
export const NOTES_MODEL_DOC = 'notesModel';
export const NOTES_MODEL_PLAYLISTS = 2;

export interface NotesModelMarker {
  version: number;
  migratedAt: string;
  summary?: { playlists: number; merged: number; bandsCreated: number };
}
