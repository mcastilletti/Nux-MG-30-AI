import { MG30_MODELS } from '@/lib/mg30-data';
import type { EffectState, EffectType } from '@/types/preset';

/**
 * Ordini dei selettori usati fino allo schema 1 dei preset salvati. Lo schema 2 usa l'ordine della
 * pedaliera (verificato sul display della MG-30): un valore salvato con lo schema 1 è l'indice
 * nell'elenco vecchio, quindi va convertito passando per l'etichetta.
 */
const OLD_SUBDIV = ['1/4', '1/8D', '1/8', '1/4T', '1/16', '1/8T', '1/32'];

const SCHEMA_1_OPTIONS: Array<{ type: EffectType; model?: string; params: string[]; options: string[] }> = [
  { type: 'modulation', params: ['subdiv'], options: OLD_SUBDIV },
  { type: 'delay', params: ['subdiv', 'subdiv1', 'subdiv2'], options: OLD_SUBDIV },
  { type: 'modulation', model: 'mod-scf', params: ['mode'], options: ['CHORUS', 'PITCH MODULATOR', 'FLANGER'] },
  { type: 'modulation', model: 'mod-uvibe', params: ['mode'], options: ['CHORUS', 'VIBRATO'] },
  { type: 'modulation', model: 'mod-harmony', params: ['scale'], options: ['MINOR', 'MAJOR'] },
];

/** Converte il valore di un selettore dall'ordine dello schema 1 a quello attuale. */
export function migrateOptionValue(type: EffectType, modelId: string, paramId: string, value: number): number {
  const rule = SCHEMA_1_OPTIONS.find((r) => r.type === type && (!r.model || r.model === modelId) && r.params.includes(paramId));
  if (!rule) return value;
  const parameter = MG30_MODELS[type]?.find((m) => m.id === modelId)?.parameters.find((p) => p.id === paramId);
  if (!parameter?.options) return value;
  const label = rule.options[Math.round(value) - parameter.min];
  const index = label === undefined ? -1 : parameter.options.indexOf(label);
  return index === -1 ? value : parameter.min + index;
}

/** Applica la conversione a tutti i selettori di un elenco di effetti (non modifica l'originale). */
export function migrateEffectsFromSchema1(effects: EffectState[]): EffectState[] {
  return effects.map((effect) => ({
    ...effect,
    parameters: Object.fromEntries(
      Object.entries(effect.parameters).map(([key, value]) => [
        key,
        typeof value === 'number' ? migrateOptionValue(effect.type, effect.model, key, value) : value,
      ]),
    ),
  }));
}
