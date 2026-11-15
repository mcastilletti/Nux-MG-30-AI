import type { EffectState, Preset } from '@/types/preset';

const cloneEffects = (effects: EffectState[]): EffectState[] => effects.map((e) => ({ ...e, parameters: { ...e.parameters } }));
const stripState = (effects: EffectState[]) => JSON.stringify(effects.map(({ type, model, enabled, parameters }) => ({ type, model, enabled, parameters })));

/** Effetti di una scena (0-based); se mancano, quelli del preset. */
export function sceneEffects(preset: Preset, scene: number): EffectState[] {
  return preset.scenes?.[scene] ?? preset.effects;
}

/** Vero se le tre scene del preset sono uguali (come nei preset di fabbrica): scegliere la scena di partenza non cambia nulla. */
export function scenesAreIdentical(preset: Preset): boolean {
  const first = stripState(sceneEffects(preset, 0));
  return [1, 2].every((i) => stripState(sceneEffects(preset, i)) === first);
}

/**
 * Preset di `base` in cui la scena `to` è sostituita da quella `from` di `source`. Le altre scene e il
 * nome restano quelli di `base`. La scena `to` diventa la scena attiva: gli `effects` sono i suoi.
 */
export function mergeSceneIntoPreset(base: Preset, source: Preset, from: number, to: number): Preset {
  const scenes: Record<number, EffectState[]> = {
    0: cloneEffects(sceneEffects(base, 0)),
    1: cloneEffects(sceneEffects(base, 1)),
    2: cloneEffects(sceneEffects(base, 2)),
  };
  scenes[to] = cloneEffects(sceneEffects(source, from));
  return { ...base, activeScene: to, effects: cloneEffects(scenes[to]), scenes, lastModified: new Date() };
}
