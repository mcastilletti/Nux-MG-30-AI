import type { EffectState, Preset } from '@/types/preset';
import data from '@/data/factory-presets.json';

/**
 * Preset di fabbrica della NUX MG-30 (128 slot), decodificati dall'esportazione QuickTone
 * "All Patch" e verificati sul display della pedaliera. Rigenerare con
 * `npx tsx scripts/build-factory-presets.ts`.
 *
 * Nel file di fabbrica le 3 scene di ogni preset sono identiche; l'ordine di `effects`
 * è la catena del preset sulla pedaliera.
 */
export interface FactoryPreset {
  slot: number;
  name: string;
  /** Nome dell'IR utente incorporato nel preset (cab caricata dall'utente), se presente. */
  userIR: string | null;
  effects: EffectState[];
}

export const FACTORY_PRESETS: FactoryPreset[] = data as FactoryPreset[];

export const getFactoryPreset = (slot: number) => FACTORY_PRESETS.find((p) => p.slot === slot);

const cloneEffects = (effects: EffectState[]) => effects.map((e) => ({ ...e, parameters: { ...e.parameters } }));

/** Preset dell'app pronto per essere scritto nello slot indicato (di default il suo slot originale). */
export function factoryPresetToPreset(factory: FactoryPreset, slot: number = factory.slot): Preset {
  return {
    slot,
    name: factory.name,
    activeScene: 0,
    category: 'Fabbrica',
    tags: ['fabbrica'],
    favorite: false,
    rating: 0,
    lastModified: new Date(),
    ampModel: 'NUX MG-30',
    effects: cloneEffects(factory.effects),
    scenes: { 0: cloneEffects(factory.effects), 1: cloneEffects(factory.effects), 2: cloneEffects(factory.effects) },
  };
}
