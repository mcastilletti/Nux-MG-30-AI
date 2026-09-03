import { MG30_MODELS, MG30Model } from '@/lib/mg30-data';
import { EffectType, Preset } from '@/types/preset';

export interface PresetSuggestionEffect {
  type: EffectType;
  model: string;
  enabled: boolean;
  parameters: Array<{ name: string; value: number }>;
}

export interface PresetSuggestion {
  name: string;
  explanation: string;
  effects: PresetSuggestionEffect[];
}

export interface PresetChange {
  type: EffectType;
  label: string;
  from: string | number | boolean;
  to: string | number | boolean;
}

export interface PresetNormalizationResult {
  updatedPreset: Preset;
  changes: PresetChange[];
  warnings: string[];
}

export interface PresetStateNormalizationResult {
  preset: Preset;
  correctedCount: number;
  warnings: string[];
}

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const PARAMETER_ALIASES: Record<string, string[]> = {
  level: ['level', 'volume', 'vol', 'output', 'effectlevel', 'mix'],
  gain: ['gain', 'drive', 'distortion'],
  mid: ['mid', 'middle'],
  time: ['time', 'delaytime'],
  repeat: ['repeat', 'feedback'],
  rate: ['rate', 'speed'],
  intensity: ['intensity', 'depth'],
  fback: ['fback', 'feedback'],
};

const findModel = (type: EffectType, requestedModel: string | undefined): MG30Model | undefined => {
  const models = MG30_MODELS[type] || [];
  if (!requestedModel) return models[0];
  const requested = normalizeKey(requestedModel);
  return models.find(model => normalizeKey(model.id) === requested)
    || models.find(model => normalizeKey(model.name) === requested)
    || models.find(model => normalizeKey(model.fullName) === requested)
    || models.find(model => normalizeKey(model.name).includes(requested) || requested.includes(normalizeKey(model.name)));
};

const findParameter = (model: MG30Model, requestedName: string) => {
  const requested = normalizeKey(requestedName);
  return model.parameters.find(parameter => normalizeKey(parameter.id) === requested)
    || model.parameters.find(parameter => normalizeKey(parameter.name) === requested)
    || model.parameters.find(parameter => {
      const aliases = Object.entries(PARAMETER_ALIASES).find(([, values]) => values.includes(requested))?.[1] || [];
      return aliases.includes(normalizeKey(parameter.id)) || aliases.includes(normalizeKey(parameter.name));
    });
};

const formatValue = (value: string | number | boolean) => typeof value === 'number' ? String(value) : String(value);

export function normalizePresetSuggestion(preset: Preset, suggestion: PresetSuggestion): PresetNormalizationResult {
  const updatedPreset: Preset = JSON.parse(JSON.stringify(preset));
  const changes: PresetChange[] = [];
  const warnings: string[] = [];
  const seenTypes = new Set<EffectType>();

  // Il nome del preset è sempre deciso manualmente dall'utente.
  // Il nome generato dall'AI viene ignorato durante l'applicazione.

  for (const proposedEffect of suggestion.effects || []) {
    if (seenTypes.has(proposedEffect.type)) {
      warnings.push(`Blocco duplicato ignorato: ${proposedEffect.type}.`);
      continue;
    }
    seenTypes.add(proposedEffect.type);

    const effect = updatedPreset.effects.find(current => current.type === proposedEffect.type);
    if (!effect) {
      warnings.push(`Blocco non presente nel preset: ${proposedEffect.type}.`);
      continue;
    }

    const model = findModel(proposedEffect.type, proposedEffect.model);
    if (!model) {
      warnings.push(`Modello non riconosciuto per ${proposedEffect.type}: ${proposedEffect.model || 'vuoto'}.`);
    } else {
      if (effect.model !== model.id) {
        changes.push({ type: effect.type, label: 'Modello', from: effect.model, to: model.id });
        effect.model = model.id;
        effect.parameters = Object.fromEntries(model.parameters.map(parameter => [parameter.id, parameter.default]));
      }

      for (const proposedParameter of proposedEffect.parameters || []) {
        const parameter = findParameter(model, proposedParameter.name);
        if (!parameter || typeof proposedParameter.value !== 'number' || !Number.isFinite(proposedParameter.value)) {
          warnings.push(`Parametro ignorato in ${model.name}: ${proposedParameter.name}.`);
          continue;
        }

        const clamped = Math.min(parameter.max, Math.max(parameter.min, proposedParameter.value));
        const normalized = Math.round(clamped / parameter.step) * parameter.step;
        if (normalized !== proposedParameter.value) {
          warnings.push(`${proposedEffect.type}.${parameter.id}: ${proposedParameter.value} corretto in ${normalized}.`);
        }
        const previous = effect.parameters[parameter.id] ?? parameter.default;
        if (previous !== normalized) {
          changes.push({ type: effect.type, label: parameter.name, from: previous, to: normalized });
          effect.parameters[parameter.id] = normalized;
        }
      }
    }

    if (typeof proposedEffect.enabled === 'boolean' && effect.enabled !== proposedEffect.enabled) {
      changes.push({ type: effect.type, label: 'Stato', from: effect.enabled, to: proposedEffect.enabled });
      effect.enabled = proposedEffect.enabled;
    }
  }

  updatedPreset.lastModified = new Date();
  return { updatedPreset, changes, warnings };
}

export function normalizePresetState(preset: Preset): PresetStateNormalizationResult {
  const normalizedPreset: Preset = JSON.parse(JSON.stringify(preset));
  const warnings: string[] = [];
  let correctedCount = 0;

  for (const effect of normalizedPreset.effects) {
    const model = (MG30_MODELS[effect.type] || []).find(candidate => candidate.id === effect.model);
    if (!model) {
      warnings.push(`Modello non riconosciuto per ${effect.type}: ${effect.model}.`);
      continue;
    }

    for (const parameter of model.parameters) {
      if (effect.parameters[parameter.id] === undefined) {
        effect.parameters[parameter.id] = parameter.default;
      }
    }

    for (const [key, value] of Object.entries(effect.parameters || {})) {
      const parameter = model.parameters.find(candidate => normalizeKey(candidate.id) === normalizeKey(key));
      if (!parameter || typeof value !== 'number' || !Number.isFinite(value)) continue;

      const clamped = Math.min(parameter.max, Math.max(parameter.min, value));
      const normalized = Math.round(clamped / parameter.step) * parameter.step;
      if (normalized !== value) {
        effect.parameters[key] = normalized;
        correctedCount++;
        warnings.push(`${effect.type}.${parameter.id}: ${value} corretto in ${normalized}.`);
      }
    }
  }

  return { preset: normalizedPreset, correctedCount, warnings };
}

export { formatValue };
