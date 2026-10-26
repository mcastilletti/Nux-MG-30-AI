import type { Band, NotesModelMarker, Playlist, PlaylistItem } from '@/types/playlist';

/**
 * Lettura difensiva dei documenti `bands`, `setlists` e del marcatore: i dati
 * arrivano da Firestore o dalla cache locale e possono essere vecchi o parziali.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function parsePlaylistItems(value: unknown): PlaylistItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: PlaylistItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !str(raw.noteId) || seen.has(str(raw.noteId))) continue;
    seen.add(str(raw.noteId));
    const item: PlaylistItem = { noteId: str(raw.noteId) };
    if (typeof raw.presetSlot === 'string') {
      item.presetSlot = raw.presetSlot;
      if (raw.presetSlot && typeof raw.presetScene === 'string' && raw.presetScene) item.presetScene = raw.presetScene;
    }
    items.push(item);
  }
  return items;
}

export function parsePlaylistDoc(id: string, data: unknown): Playlist | null {
  if (!isRecord(data) || !str(data.name)) return null;
  return {
    id,
    name: str(data.name),
    bandId: str(data.bandId),
    userId: str(data.userId),
    items: parsePlaylistItems(data.items),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function parseBandDoc(id: string, data: unknown): Band | null {
  if (!isRecord(data) || !str(data.name)) return null;
  return { id, name: str(data.name), userId: str(data.userId), logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : null, createdAt: data.createdAt, updatedAt: data.updatedAt };
}

export function parseNotesModelMarker(data: unknown): NotesModelMarker | null {
  if (!isRecord(data) || typeof data.version !== 'number') return null;
  return { version: data.version, migratedAt: str(data.migratedAt), summary: isRecord(data.summary) ? data.summary as NotesModelMarker['summary'] : undefined };
}
