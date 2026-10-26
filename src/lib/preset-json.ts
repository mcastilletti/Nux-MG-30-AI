import { MG30_MODELS } from '@/lib/mg30-data';
import { EffectType, Preset } from '@/types/preset';
import { normalizePresetState } from '@/lib/mg30-preset-normalizer';

/**
 * Preset descritto in JSON (incollato nell'AI Mode) applicato al preset attivo.
 * Spostato invariato da src/app/editor/page.tsx (Fase 4).
 */
export function parseDirectJsonInput(value: string): { parsed: any | null; looksLikeJson: boolean; error?: string } {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const looksLikeJson = Boolean(fenced) || candidate.startsWith('{') || candidate.startsWith('[');
  if (!looksLikeJson) return { parsed: null, looksLikeJson: false };

  try {
    return { parsed: JSON.parse(candidate), looksLikeJson: true };
  } catch (error: any) {
    return { parsed: null, looksLikeJson: true, error: error?.message || 'JSON non valido.' };
  }
}

export function applyJsonToPreset(preset: Preset, json: any): { updatedPreset: Preset; appliedCount: number; warnings: string[] } {
  let appliedCount = 0;

  // Clone the preset to avoid direct mutations
  const newPreset = JSON.parse(JSON.stringify(preset));

  // Synonym mapping for common parameter names
  const PARAM_SYNONYMS: Record<string, string[]> = {
    'level': ['echo', 'mix', 'intensity', 'level', 'volume', 'vol', 'effect level'],
    'irlevel': ['level', 'volume', 'vol', 'ir level'],
    'lowcut': ['lowcut', 'low cut', 'lo cut', 'locut'],
    'highcut': ['highcut', 'high cut', 'hi cut', 'hicut'],
    'time': ['time', 'repeat', 'speed', 'rate', 'position', 'delay time'],
    'feedback': ['feedback', 'repeat', 'decay', 'fback'],
    'threshold': ['threshold', 'sensitivity', 'sens'],
    'middle': ['mid', 'middle'],
    'treble': ['treble', 'treb'],
    'presence': ['presence', 'pres'],
    'drive': ['drive', 'drv', 'gain'],
    'distortion': ['distortion', 'dist', 'drive', 'gain'],
  };

  const BLOCK_MAP: Record<string, string> = {
    'gate': 'noise-gate',
    'ng': 'noise-gate',
    'noise-gate': 'noise-gate',
    'efx': 'efx',
    'wah': 'wah',
    'amp': 'amp',
    'ir': 'ir',
    'mod': 'modulation',
    'modulation': 'modulation',
    'dly': 'delay',
    'delay': 'delay',
    'rvb': 'reverb',
    'reverb': 'reverb',
    'vol': 'vol',
    'eq': 'eq'
  };

  // Robust value parser to handle strings like "CC 55, Value 35" or just "35"
  const parseParamValue = (val: any): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'string') {
      const valueMatch = val.match(/(?:value|valore)\s*:?\s*(\d+(\.\d+)?)/i);
      if (valueMatch) {
        return Number(valueMatch[1]);
      }
      const num = Number(val);
      if (!isNaN(num)) return num;

      const numbers = val.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        return Number(numbers[numbers.length - 1]);
      }
    }
    return null;
  };

  const findModel = (effectType: EffectType, modelName: string) => {
    const models = MG30_MODELS[effectType] || [];
    const cleanName = modelName.toLowerCase().replace(/[^a-z0-9]/g, '');

    let found = models.find(m => m.id.toLowerCase() === cleanName);
    if (found) return found;

    found = models.find(m =>
      m.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName ||
      m.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName
    );
    if (found) return found;

    found = models.find(m =>
      m.name.toLowerCase().includes(modelName.toLowerCase()) ||
      m.fullName.toLowerCase().includes(modelName.toLowerCase()) ||
      modelName.toLowerCase().includes(m.name.toLowerCase())
    );
    return found;
  };

  // Helper to update a parameter in a specific effect
  const setParam = (effect: any, paramName: string, val: any) => {
    const normalizedParamName = paramName.toLowerCase().replace(/[\s_-]/g, '');
    let targetKey = Object.keys(effect.parameters || {}).find(
      k => k.toLowerCase() === paramName.toLowerCase() ||
        k.toLowerCase().replace(/[\s_-]/g, '') === normalizedParamName
    );

    if (targetKey === undefined) {
      // 🔧 Fix 2: Reverse lookup per PARAM_SYNONYMS
      // Prima prova la ricerca diretta (chiave JSON → lista alias)
      let synonyms = PARAM_SYNONYMS[paramName.toLowerCase()] || PARAM_SYNONYMS[normalizedParamName];
      if (synonyms) {
        targetKey = Object.keys(effect.parameters || {}).find(
          pk => synonyms.some(synonym => synonym.replace(/[\s_-]/g, '') === pk.toLowerCase().replace(/[\s_-]/g, ''))
        );
      }

      // Se non trovato, prova reverse lookup (parametro JSON è un alias)
      if (targetKey === undefined) {
        const normalizedParamForReverse = paramName.toLowerCase().replace(/[\s_-]/g, '');
        for (const [canonicalKey, aliasList] of Object.entries(PARAM_SYNONYMS)) {
          const canonicalNormalized = canonicalKey.replace(/[\s_-]/g, '');
          if (aliasList.some(alias => alias.replace(/[\s_-]/g, '') === normalizedParamForReverse)) {
            targetKey = Object.keys(effect.parameters || {}).find(
              pk => pk.toLowerCase().replace(/[\s_-]/g, '') === canonicalNormalized
            );
            if (targetKey) break;
          }
        }
      }
    }

    if (targetKey !== undefined) {
      const parsedVal = parseParamValue(val);
      if (parsedVal !== null) {
        effect.parameters[targetKey] = parsedVal;
        appliedCount++;
      }
    }
  };

  // Helper to handle a single effect object block
  const mergeEffectBlock = (effect: any, blockData: any) => {
    if (typeof blockData !== 'object' || blockData === null) return;

    // Status/Enabled
    if (blockData.hasOwnProperty('status') || blockData.hasOwnProperty('Status') || blockData.hasOwnProperty('enabled') || blockData.hasOwnProperty('Enabled')) {
      const val = blockData.status ?? blockData.Status ?? blockData.enabled ?? blockData.Enabled;
      if (typeof val === 'boolean') {
        effect.enabled = val;
        appliedCount++;
      } else if (typeof val === 'string') {
        const upperVal = val.toUpperCase();
        effect.enabled = upperVal === 'ON' || upperVal === 'TRUE' || upperVal === '1' || upperVal.includes('ON');
        appliedCount++;
      }
    }

    // Model Selection
    if (blockData.hasOwnProperty('model') || blockData.hasOwnProperty('Model')) {
      const val = blockData.model ?? blockData.Model;
      if (typeof val === 'string' && val.toUpperCase() !== 'BYPASS') {
        const matchedModel = findModel(effect.type, val);
        if (matchedModel) {
          effect.model = matchedModel.id;
          appliedCount++;

          // Populate default parameters when changing model
          const defaultParams: Record<string, number | string> = {};
          matchedModel.parameters.forEach((p: any) => {
            defaultParams[p.id.toLowerCase()] = p.default;
          });
          effect.parameters = { ...defaultParams };
        }
      } else if (typeof val === 'string' && val.toUpperCase() === 'BYPASS') {
        effect.enabled = false;
        appliedCount++;
      }
    }

    // Process nested parameters
    const params = blockData.params ?? blockData.Params ?? blockData.parameters ?? blockData.Parameters;
    if (typeof params === 'object' && params !== null) {
      Object.keys(params).forEach(k => {
        setParam(effect, k, params[k]);
      });
    }

    // Process flat parameters
    Object.keys(blockData).forEach(k => {
      const lowerK = k.toLowerCase();
      if (lowerK !== 'enabled' && lowerK !== 'model' && lowerK !== 'parameters' && lowerK !== 'params' && lowerK !== 'id' && lowerK !== 'type' && lowerK !== 'status') {
        setParam(effect, k, blockData[k]);
      }
    });
  };

  // Main JSON processing
  if (json && typeof json === 'object') {
    // Il nome del preset è gestito esclusivamente dall'utente, mai dal JSON.
    // preset_goal/name restano descrittivi e non vengono applicati allo slot.

    // Signal Chain
    const signalChain = json.signal_chain ?? json.SignalChain;
    if (signalChain && typeof signalChain === 'object') {
      Object.keys(signalChain).forEach(key => {
        const mappedType = BLOCK_MAP[key.toLowerCase()];
        if (mappedType) {
          const effect = newPreset.effects.find((e: any) => e.type === mappedType);
          if (effect) {
            mergeEffectBlock(effect, signalChain[key]);
          }
        }
      });
    }

    // 3. MIDI Data/Instructions Fallback (if they provided flat parameter list inside midi_data)
    let midiParams: any = null;
    if (json.midi_data?.instructions?.CC_Parameters) {
      midiParams = json.midi_data.instructions.CC_Parameters;
    } else if (json.midi_data?.instructions?.CC_Blocks) {
      midiParams = { ...midiParams, ...json.midi_data.instructions.CC_Blocks };
    }

    if (midiParams && typeof midiParams === 'object') {
      Object.keys(midiParams).forEach(k => {
        let matchedPrefixedParam = false;
        const lowerKey = k.toLowerCase();

        newPreset.effects.forEach((e: any) => {
          const idPref = e.id.toLowerCase() + '_';
          const typePref = e.type.toLowerCase() + '_';
          const idPrefDash = e.id.toLowerCase() + '-';
          const typePrefDash = e.type.toLowerCase() + '-';

          let paramPart = '';
          if (lowerKey.startsWith(idPref)) {
            paramPart = k.substring(idPref.length);
          } else if (lowerKey.startsWith(typePref)) {
            paramPart = k.substring(typePref.length);
          } else if (lowerKey.startsWith(idPrefDash)) {
            paramPart = k.substring(idPrefDash.length);
          } else if (lowerKey.startsWith(typePrefDash)) {
            paramPart = k.substring(typePrefDash.length);
          }

          if (paramPart) {
            let targetKey = Object.keys(e.parameters || {}).find(
              pk => pk.toLowerCase() === paramPart.toLowerCase() ||
                pk.toLowerCase().replace(/[-_]/g, '') === paramPart.toLowerCase().replace(/[-_]/g, '')
            );

            if (targetKey === undefined) {
              // 🔧 Fix 2: Reverse lookup per PARAM_SYNONYMS
              let synonyms = PARAM_SYNONYMS[paramPart.toLowerCase()];
              if (synonyms) {
                targetKey = Object.keys(e.parameters || {}).find(
                  pk => synonyms.includes(pk.toLowerCase())
                );
              }

              // Se non trovato, prova reverse lookup
              if (targetKey === undefined) {
                const normalizedParamForReverse = paramPart.toLowerCase().replace(/[\s_-]/g, '');
                for (const [canonicalKey, aliasList] of Object.entries(PARAM_SYNONYMS)) {
                  const canonicalNormalized = canonicalKey.replace(/[\s_-]/g, '');
                  if (aliasList.some(alias => alias.replace(/[\s_-]/g, '') === normalizedParamForReverse)) {
                    targetKey = Object.keys(e.parameters || {}).find(
                      pk => pk.toLowerCase().replace(/[\s_-]/g, '') === canonicalNormalized
                    );
                    if (targetKey) break;
                  }
                }
              }
            }

            if (targetKey !== undefined) {
              const parsedVal = parseParamValue(midiParams[k]);
              if (parsedVal !== null) {
                e.parameters[targetKey] = parsedVal;
                appliedCount++;
                matchedPrefixedParam = true;
              }
            }
          }
        });

        if (!matchedPrefixedParam) {
          newPreset.effects.forEach((e: any) => {
            setParam(e, k, midiParams[k]);
          });
        }
      });
    }

    // 4. Fallback: Array format, or nested format (if signal chain is not present)
    if (!signalChain && !midiParams) {
      if (Array.isArray(json)) {
        json.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            const effect = newPreset.effects.find(
              (e: any) => (item.id && e.id === item.id) || (item.type && e.type === item.type)
            );
            if (effect) {
              mergeEffectBlock(effect, item);
            }
          }
        });
      } else {
        let hasBlockKeys = false;
        newPreset.effects.forEach((e: any) => {
          if (json.hasOwnProperty(e.id) || json.hasOwnProperty(e.type)) {
            hasBlockKeys = true;
            const blockData = json[e.id] ?? json[e.type];
            mergeEffectBlock(e, blockData);
          }
        });

        if (!hasBlockKeys) {
          Object.keys(json).forEach(k => {
            let matchedPrefixedParam = false;
            const lowerKey = k.toLowerCase();

            newPreset.effects.forEach((e: any) => {
              const idPref = e.id.toLowerCase() + '_';
              const typePref = e.type.toLowerCase() + '_';
              const idPrefDash = e.id.toLowerCase() + '-';
              const typePrefDash = e.type.toLowerCase() + '-';

              let paramPart = '';
              if (lowerKey.startsWith(idPref)) {
                paramPart = k.substring(idPref.length);
              } else if (lowerKey.startsWith(typePref)) {
                paramPart = k.substring(typePref.length);
              } else if (lowerKey.startsWith(idPrefDash)) {
                paramPart = k.substring(idPrefDash.length);
              } else if (lowerKey.startsWith(typePrefDash)) {
                paramPart = k.substring(typePrefDash.length);
              }

              if (paramPart) {
                let targetKey = Object.keys(e.parameters || {}).find(
                  pk => pk.toLowerCase() === paramPart.toLowerCase() ||
                    pk.toLowerCase().replace(/[-_]/g, '') === paramPart.toLowerCase().replace(/[-_]/g, '')
                );

                if (targetKey === undefined) {
                  // 🔧 Fix 2: Reverse lookup per PARAM_SYNONYMS
                  let synonyms = PARAM_SYNONYMS[paramPart.toLowerCase()];
                  if (synonyms) {
                    targetKey = Object.keys(e.parameters || {}).find(
                      pk => synonyms.includes(pk.toLowerCase())
                    );
                  }

                  // Se non trovato, prova reverse lookup
                  if (targetKey === undefined) {
                    const normalizedParamForReverse = paramPart.toLowerCase().replace(/[\s_-]/g, '');
                    for (const [canonicalKey, aliasList] of Object.entries(PARAM_SYNONYMS)) {
                      const canonicalNormalized = canonicalKey.replace(/[\s_-]/g, '');
                      if (aliasList.some(alias => alias.replace(/[\s_-]/g, '') === normalizedParamForReverse)) {
                        targetKey = Object.keys(e.parameters || {}).find(
                          pk => pk.toLowerCase().replace(/[\s_-]/g, '') === canonicalNormalized
                        );
                        if (targetKey) break;
                      }
                    }
                  }
                }

                if (targetKey !== undefined) {
                  const parsedVal = parseParamValue(json[k]);
                  if (parsedVal !== null) {
                    e.parameters[targetKey] = parsedVal;
                    appliedCount++;
                    matchedPrefixedParam = true;
                  }
                }
              }
            });

            if (!matchedPrefixedParam) {
              newPreset.effects.forEach((e: any) => {
                setParam(e, k, json[k]);
              });
            }
          });
        }
      }
    }
  }

  const normalized = normalizePresetState(newPreset);
  normalized.preset.lastModified = new Date();
  return {
    updatedPreset: normalized.preset,
    appliedCount: appliedCount + normalized.correctedCount,
    warnings: normalized.warnings
  };
}
