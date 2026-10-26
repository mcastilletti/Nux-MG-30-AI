import type { SavedNote } from '@/types/note';

/**
 * Backup completo delle note (brani e blocchi) con band e scalette, prima della
 * conversione a playlist (Fase 6.2). Il file conserva i campi così come sono
 * in Firestore (`band`, `setlist`, `order` compresi); le date diventano ISO.
 */
export const NOTES_BACKUP_FORMAT = 'mg30-notes-backup';
export const NOTES_BACKUP_VERSION = 1;

export type NotesBackupSource = 'cloud' | 'device';

export interface NotesBackupFile {
  format: typeof NOTES_BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  /** `cloud`: letto ora dall'account; `device`: copia sul dispositivo (offline), senza band e scalette della pagina Band. */
  source: NotesBackupSource;
  counts: { notes: number; songs: number; blocks: number; bands: number; setlists: number };
  notes: Record<string, unknown>[];
  bands: Record<string, unknown>[];
  setlists: Record<string, unknown>[];
}

const isTimestampLike = (value: unknown): value is { toDate: () => Date } =>
  typeof value === 'object' && value !== null && typeof (value as { toDate?: unknown }).toDate === 'function';

/** Rende un valore Firestore serializzabile in JSON: Timestamp e Date diventano stringhe ISO. */
export function toJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (isTimestampLike(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (v !== undefined) out[key] = toJsonValue(v);
    }
    return out;
  }
  return value;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function buildNotesBackup({ notes, bands = [], setlists = [], source, now = new Date() }: {
  notes: SavedNote[];
  bands?: Record<string, unknown>[];
  setlists?: Record<string, unknown>[];
  source: NotesBackupSource;
  now?: Date;
}): NotesBackupFile {
  const sortedNotes = [...notes].sort((a, b) =>
    text(a.band).localeCompare(text(b.band)) ||
    text(a.setlist).localeCompare(text(b.setlist)) ||
    (a.order ?? 0) - (b.order ?? 0) ||
    text(a.title).localeCompare(text(b.title)));
  const blocks = notes.filter((note) => note.type === 'block').length;
  return {
    format: NOTES_BACKUP_FORMAT,
    version: NOTES_BACKUP_VERSION,
    exportedAt: now.toISOString(),
    source,
    counts: { notes: notes.length, songs: notes.length - blocks, blocks, bands: bands.length, setlists: setlists.length },
    notes: sortedNotes.map((note) => toJsonValue(note) as Record<string, unknown>),
    bands: bands.map((band) => toJsonValue(band) as Record<string, unknown>),
    setlists: setlists.map((setlist) => toJsonValue(setlist) as Record<string, unknown>),
  };
}

export const notesBackupFileName = (file: NotesBackupFile) => `mg30-note-backup-${file.exportedAt.slice(0, 10)}.json`;
