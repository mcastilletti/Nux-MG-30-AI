import type { EffectState, Preset } from '@/types/preset';
import { normalizePresetSuggestion, type PresetNormalizationResult, type PresetSuggestion } from '@/lib/mg30-preset-normalizer';

/** Volume di patch dei suoni creati dall'AI: MIN 50 (0..50) e MAX 100 (50..100). */
export const AI_PATCH_VOLUME = { min: 50, max: 100 } as const;

const cloneEffects = (effects: EffectState[]): EffectState[] => effects.map((e) => ({ ...e, parameters: { ...e.parameters } }));
const withVolume = (effects: EffectState[]): EffectState[] =>
  effects.map((e) => (e.type === 'vol' ? { ...e, enabled: true, parameters: { ...e.parameters, ...AI_PATCH_VOLUME } } : e));

/** Preset con il volume di patch a MIN 50 / MAX 100 in effetti e in tutte le scene (il volume è del preset, non della scena). */
export function applyPatchVolume(preset: Preset): Preset {
  const scenes = preset.scenes
    ? Object.fromEntries(Object.entries(preset.scenes).map(([k, effects]) => [k, withVolume(effects)])) as Record<number, EffectState[]>
    : undefined;
  return { ...preset, effects: withVolume(preset.effects), ...(scenes ? { scenes } : {}) };
}

/**
 * Applica una proposta dell'AI a UNA sola scena: le altre due scene non cambiano. Il risultato ha la scena
 * scelta come scena attiva (i suoi `effects`), il volume di patch a 50/100 e `changes` riferiti a quella scena.
 */
export function applySuggestionToScene(preset: Preset, suggestion: PresetSuggestion, scene: number): PresetNormalizationResult {
  const sceneEffects = preset.scenes?.[scene] ?? preset.effects;
  const base: Preset = { ...preset, activeScene: scene, effects: cloneEffects(sceneEffects) };
  const { updatedPreset, changes, warnings } = normalizePresetSuggestion(base, suggestion);
  const scenes: Record<number, EffectState[]> = {
    0: cloneEffects(preset.scenes?.[0] ?? preset.effects),
    1: cloneEffects(preset.scenes?.[1] ?? preset.effects),
    2: cloneEffects(preset.scenes?.[2] ?? preset.effects),
  };
  scenes[scene] = cloneEffects(updatedPreset.effects);
  const merged = applyPatchVolume({ ...updatedPreset, activeScene: scene, effects: cloneEffects(scenes[scene]), scenes });
  // Il volume imposto dall'app non è una modifica dell'AI: si mostra tra le modifiche solo se cambia davvero.
  const volBefore = sceneEffects.find((e) => e.type === 'vol');
  const volAfter = merged.effects.find((e) => e.type === 'vol');
  const volChanges = (['min', 'max'] as const)
    .filter((key) => volBefore && volAfter && volBefore.parameters[key] !== volAfter.parameters[key])
    .map((key) => ({ type: 'vol' as const, label: key === 'min' ? 'VOL MIN' : 'VOL MAX', from: volBefore!.parameters[key], to: volAfter!.parameters[key] }));
  return { updatedPreset: merged, changes: [...changes.filter((c) => c.type !== 'vol'), ...volChanges], warnings };
}
