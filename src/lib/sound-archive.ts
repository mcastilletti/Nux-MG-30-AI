import type { Preset } from '@/types/preset';
import { fromPresetDoc, toPresetDoc, type PresetDoc } from '@/lib/preset-storage';

/** Da dove arriva un suono archiviato. */
export type SoundArchiveSource = 'editor' | 'slot' | 'import';

export const SOUND_ARCHIVE_SOURCE_LABEL: Record<SoundArchiveSource, string> = {
  editor: "Dall'editor",
  slot: 'Sostituito in uno slot',
  import: 'Importato',
};

/**
 * Suono dell'Archivio: un preset completo (3 scene) non legato a uno slot.
 * Salvato in `users/{uid}/soundArchive/{id}` e in localStorage `mg30-sound-archive`.
 */
export interface ArchivedSound {
  id: string;
  schemaVersion: 1;
  name: string;
  source: SoundArchiveSource;
  /** Slot da cui è stato preso, se c'era. */
  originSlot: number | null;
  preset: PresetDoc;
  createdAt: string;
  updatedAt: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const newId = () =>
  `snd_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Math.random().toString(36).slice(2, 14)}`;

export function createArchivedSound(preset: Preset, source: SoundArchiveSource, options: { name?: string; originSlot?: number | null; now?: Date } = {}): ArchivedSound {
  const now = (options.now ?? new Date()).toISOString();
  const name = (options.name ?? preset.name).trim() || 'Suono senza nome';
  return {
    id: newId(),
    schemaVersion: 1,
    name,
    source,
    originSlot: options.originSlot ?? null,
    preset: toPresetDoc({ ...preset, name }),
    createdAt: now,
    updatedAt: now,
  };
}

/** Valida un documento letto (cloud o locale). */
export function parseArchivedSound(data: unknown): ArchivedSound | null {
  if (!isRecord(data) || typeof data.id !== 'string' || !data.id) return null;
  if (!fromPresetDoc(data.preset)) return null;
  const source = (['editor', 'slot', 'import'] as const).includes(data.source as SoundArchiveSource) ? (data.source as SoundArchiveSource) : 'editor';
  const originSlot = typeof data.originSlot === 'number' && data.originSlot >= 1 && data.originSlot <= 128 ? data.originSlot : null;
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString();
  return {
    id: data.id,
    schemaVersion: 1,
    name: typeof data.name === 'string' && data.name.trim() ? data.name : 'Suono senza nome',
    source,
    originSlot,
    preset: data.preset as PresetDoc,
    createdAt,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : createdAt,
  };
}

/** Preset pronto per lo slot indicato. */
export function archivedSoundToPreset(sound: ArchivedSound, slot: number): Preset {
  const preset = fromPresetDoc({ ...sound.preset, slot })!;
  return { ...preset, name: sound.name, lastModified: new Date() };
}

export function renameArchivedSound(sound: ArchivedSound, name: string, now: Date = new Date()): ArchivedSound {
  const trimmed = name.trim() || sound.name;
  return { ...sound, name: trimmed, preset: { ...sound.preset, name: trimmed }, updatedAt: now.toISOString() };
}

/** Ordinamento per la libreria: i più recenti prima. */
export const sortArchivedSounds = (sounds: ArchivedSound[]) =>
  [...sounds].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
