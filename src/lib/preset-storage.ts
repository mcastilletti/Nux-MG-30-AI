import { EffectState, EffectType, Preset } from '@/types/preset';
import { ensurePresetScenes } from '@/stores/use-preset-store';
import { normalizePresetState } from '@/lib/mg30-preset-normalizer';

/** Versione dello schema dei preset salvati (Firestore, cache locale, file JSON). */
export const PRESET_SCHEMA_VERSION = 1;
export const PRESET_EXPORT_FORMAT = 'mg30-studio-presets';

const EFFECT_TYPES: EffectType[] = ['wah', 'noise-gate', 'compressor', 'efx', 'amp', 'ir', 'sr', 'modulation', 'delay', 'reverb', 'vol', 'eq'];

/** Documento salvato: JSON puro, senza Date né undefined (Firestore li rifiuta). */
export interface PresetDoc {
  id: string;
  schemaVersion: number;
  slot: number;
  name: string;
  category: string;
  tags: string[];
  favorite: boolean;
  rating: number;
  ampModel: string;
  activeScene: number;
  effects: EffectState[];
  scenes: Record<string, EffectState[]>;
  lastModified: string;
}

export interface PresetExportFile {
  format: typeof PRESET_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  presets: PresetDoc[];
}

export const presetDocId = (slot: number) => `slot_${slot}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toIso = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  // Timestamp di Firestore
  if (isRecord(value) && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return toIso((value as { toDate: () => Date }).toDate());
  }
  return new Date().toISOString();
};

const cleanEffects = (effects: EffectState[]): EffectState[] =>
  effects.map((effect) => ({
    id: String(effect.id),
    type: effect.type,
    model: String(effect.model),
    enabled: !!effect.enabled,
    parameters: Object.fromEntries(
      Object.entries(effect.parameters || {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string'),
    ),
  }));

export function toPresetDoc(preset: Preset): PresetDoc {
  const norm = ensurePresetScenes(preset);
  const scenes: Record<string, EffectState[]> = {};
  for (const [key, effects] of Object.entries(norm.scenes || {})) scenes[key] = cleanEffects(effects);
  return {
    id: presetDocId(norm.slot),
    schemaVersion: PRESET_SCHEMA_VERSION,
    slot: norm.slot,
    name: String(norm.name ?? ''),
    category: String(norm.category ?? 'User'),
    tags: Array.isArray(norm.tags) ? norm.tags.map(String) : [],
    favorite: !!norm.favorite,
    rating: typeof norm.rating === 'number' ? norm.rating : 0,
    ampModel: String(norm.ampModel ?? 'NUX MG-30'),
    activeScene: norm.activeScene,
    effects: cleanEffects(norm.effects),
    scenes,
    lastModified: toIso(norm.lastModified),
  };
}

const parseEffects = (value: unknown): EffectState[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const effects: EffectState[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    if (typeof item.id !== 'string' || typeof item.model !== 'string') return null;
    if (!EFFECT_TYPES.includes(item.type as EffectType)) return null;
    if (!isRecord(item.parameters)) return null;
    effects.push({
      id: item.id,
      type: item.type as EffectType,
      model: item.model,
      enabled: !!item.enabled,
      parameters: Object.fromEntries(
        Object.entries(item.parameters).filter(([, v]) => (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string'),
      ) as Record<string, number | string>,
    });
  }
  return effects;
};

/** Converte un documento salvato in Preset. Restituisce null se i dati non sono validi. */
export function fromPresetDoc(data: unknown): Preset | null {
  if (!isRecord(data)) return null;
  const slot = data.slot;
  if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 1 || slot > 128) return null;
  const effects = parseEffects(data.effects);
  if (!effects) return null;

  const scenes: Record<number, EffectState[]> = {};
  if (isRecord(data.scenes)) {
    for (const [key, value] of Object.entries(data.scenes)) {
      const index = Number(key);
      const parsed = parseEffects(value);
      if ([0, 1, 2].includes(index) && parsed) scenes[index] = parsed;
    }
  }
  const activeScene = [0, 1, 2].includes(data.activeScene as number) ? (data.activeScene as number) : 0;

  const preset = ensurePresetScenes({
    slot,
    name: typeof data.name === 'string' && data.name.trim() ? data.name : `Preset ${slot}`,
    category: typeof data.category === 'string' ? data.category : 'User',
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
    favorite: !!data.favorite,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    ampModel: typeof data.ampModel === 'string' ? data.ampModel : 'NUX MG-30',
    activeScene,
    effects,
    scenes: Object.keys(scenes).length ? scenes : undefined,
    lastModified: new Date(toIso(data.lastModified)),
  });

  // Riporta i parametri nei limiti dei modelli MG-30 (scena attiva e scene salvate).
  const normalizeEffects = (list: EffectState[]) => normalizePresetState({ ...preset, effects: list }).preset.effects;
  const normalizedScenes: Record<number, EffectState[]> = {};
  for (const [key, list] of Object.entries(preset.scenes || {})) normalizedScenes[Number(key)] = normalizeEffects(list);
  return { ...preset, effects: normalizeEffects(preset.effects), scenes: normalizedScenes };
}

export function buildPresetExport(presets: Preset[], now: Date = new Date()): PresetExportFile {
  return {
    format: PRESET_EXPORT_FORMAT,
    version: PRESET_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    presets: [...presets].sort((a, b) => a.slot - b.slot).map(toPresetDoc),
  };
}

export type PresetImportResult =
  | { ok: true; presets: Preset[]; skipped: number }
  | { ok: false; error: string };

/** Legge un file di esportazione. Non modifica nulla: restituisce i preset validi. */
export function parsePresetImport(text: string): PresetImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' };
  }
  if (!isRecord(data) || data.format !== PRESET_EXPORT_FORMAT) {
    return { ok: false, error: 'Il file non è un\'esportazione di preset di MG30 Studio.' };
  }
  if (typeof data.version !== 'number' || data.version > PRESET_SCHEMA_VERSION) {
    return { ok: false, error: 'Il file è stato creato da una versione più recente dell\'app.' };
  }
  if (!Array.isArray(data.presets)) {
    return { ok: false, error: 'Il file non contiene preset.' };
  }
  const bySlot = new Map<number, Preset>();
  let skipped = 0;
  for (const item of data.presets) {
    const preset = fromPresetDoc(item);
    if (preset) bySlot.set(preset.slot, preset);
    else skipped++;
  }
  if (bySlot.size === 0) {
    return { ok: false, error: 'Nessun preset valido nel file.' };
  }
  return { ok: true, presets: [...bySlot.values()].sort((a, b) => a.slot - b.slot), skipped };
}
