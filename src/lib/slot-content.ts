import type { Preset } from '@/types/preset';
import { createDefaultEffects } from '@/lib/default-effects';
import { formatSlotLabel } from '@/lib/slot';

const strip = (effects: Preset['effects']) => JSON.stringify(effects.map(({ type, model, enabled, parameters }) => ({ type, model, enabled, parameters })));
const DEFAULT_EFFECTS = strip(createDefaultEffects());

/**
 * Vero se l'app non conosce il contenuto reale dello slot: è ancora il preset di partenza
 * (nome "Preset 01A" e blocchi predefiniti), cioè mai salvato né letto dalla pedaliera.
 * Archiviarlo salverebbe il preset predefinito dell'app, non il suono che c'è sulla MG-30.
 */
export function isPlaceholderPreset(preset: Preset, savedName?: string): boolean {
  if (savedName && savedName.trim()) return false;
  if (preset.name !== `Preset ${formatSlotLabel(preset.slot)}`) return false;
  return strip(preset.effects) === DEFAULT_EFFECTS;
}
