"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Undo2, Redo2, Save, LayoutGrid, ChevronLeft, ChevronRight, Settings2, Sparkles, Loader2, RefreshCw, CheckCircle2, X, Layers, Copy, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MG30_MODELS } from '@/lib/mg30-data';
import { generateMG30Preset, MG30PresetOutput } from '@/ai/flows/mg30-preset-gen';
import { useToast } from '@/hooks/use-toast';
import { EffectType, Preset } from '@/types/preset';
import { formatValue, normalizePresetState, normalizePresetSuggestion, PresetNormalizationResult } from '@/lib/mg30-preset-normalizer';
import { useInstrumentationStore } from '@/stores/use-instrumentation-store';
import { usePresetNames } from '@/hooks/use-preset-names';
import { BlockIcon } from '@/components/icons/block-icons';

function parseDirectJsonInput(value: string): { parsed: any | null; looksLikeJson: boolean; error?: string } {
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

function applyJsonToPreset(preset: Preset, json: any): { updatedPreset: Preset; appliedCount: number; warnings: string[] } {
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
      const synonyms = PARAM_SYNONYMS[paramName.toLowerCase()] || PARAM_SYNONYMS[normalizedParamName];
      if (synonyms) {
        targetKey = Object.keys(effect.parameters || {}).find(
          pk => synonyms.some(synonym => synonym.replace(/[\s_-]/g, '') === pk.toLowerCase().replace(/[\s_-]/g, ''))
        );
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
              const synonyms = PARAM_SYNONYMS[paramPart.toLowerCase()];
              if (synonyms) {
                targetKey = Object.keys(e.parameters || {}).find(
                  pk => synonyms.includes(pk.toLowerCase())
                );
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
                  const synonyms = PARAM_SYNONYMS[paramPart.toLowerCase()];
                  if (synonyms) {
                    targetKey = Object.keys(e.parameters || {}).find(
                      pk => synonyms.includes(pk.toLowerCase())
                    );
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

const getBlockColorVar = (type: string) => {
  switch (type) {
    case 'wah': return '300 100% 75%';
    case 'noise-gate': return '70 100% 50%';
    case 'compressor': return '60 100% 50%';
    case 'efx': return '32 100% 50%';
    case 'amp': return '0 100% 50%';
    case 'ir': return '192 100% 50%';
    case 'sr': return '120 100% 50%';
    case 'modulation': return '220 100% 50%';
    case 'delay': return '180 100% 50%';
    case 'reverb': return '288 100% 50%';
    case 'vol': return '0 0% 80%';
    case 'eq': return '0 0% 100%';
    default: return 'var(--primary)';
  }
};

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

export default function EditorPage() {
  const { activePreset, updateParameter, updateModel, updateScene, toggleEffect, undo, redo, setActivePreset, updatePresetName } = usePresetStore();
  const { status, devicePresets, sendProgramChange, sendKnobParameter, sendModelChange, sendSceneChange, toggleBlock, enterBlockEditor, exitBlockEditor, isEditorSyncing, syncActivePreset, syncFullPreset } = useMidiStore();
  const { toast } = useToast();
  const { savedNames, savePresetName } = usePresetNames();

  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposedPreset, setProposedPreset] = useState<MG30PresetOutput | null>(null);
  const [proposedNormalization, setProposedNormalization] = useState<PresetNormalizationResult | null>(null);
  const [isCopySceneOpen, setIsCopySceneOpen] = useState(false);
  const [copyTargetSlot, setCopyTargetSlot] = useState(String(activePreset.slot));
  const [copyTargetScene, setCopyTargetScene] = useState(String(activePreset.activeScene));
  const [isEditingPresetName, setIsEditingPresetName] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const { guitars, amplifiers, selectedGuitarId, selectedAmplifierId, selectGuitar, selectAmplifier } = useInstrumentationStore();
  const selectedGuitar = guitars.find(guitar => guitar.id === selectedGuitarId);
  const selectedAmplifier = amplifiers.find(amplifier => amplifier.id === selectedAmplifierId);

  const selectedEffect = useMemo(() =>
    activePreset.effects.find(e => e.id === selectedBlockId),
    [activePreset.effects, selectedBlockId]
  );

  const currentModelData = useMemo(() => {
    if (!selectedEffect) return null;
    return MG30_MODELS[selectedEffect.type]?.find(m => m.id === selectedEffect.model) || MG30_MODELS[selectedEffect.type]?.[0];
  }, [selectedEffect]);

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const handleParamChange = (effectType: string, paramId: string, value: number, index: number) => {
    updateParameter(selectedBlockId, paramId, value);
    if (status === 'connected') {
      sendKnobParameter(selectedBlockId, index, value);
    }
  };

  const handleModelChange = (effectId: string, type: string, modelId: string) => {
    updateModel(effectId, modelId);
    if (status === 'connected') {
      sendModelChange(type, modelId);
    }
  };

  const handleSceneChange = (index: number) => {
    updateScene(index);
    if (status === 'connected') {
      sendSceneChange(index);
    }
  };

  const handleSelectBlock = (effectId: string, type: string) => {
    setSelectedBlockId(effectId);
    if (status === 'connected') {
      enterBlockEditor(type);
    }
  };

  const handleToggleBlock = (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => {
    e.stopPropagation();
    toggleEffect(effectId);
    if (status === 'connected') {
      toggleBlock(type, !currentEnabled);
    }
  };

  const handleSlotChange = (direction: 'next' | 'prev') => {
    let nextSlot = activePreset.slot + (direction === 'next' ? 1 : -1);
    if (nextSlot < 1) nextSlot = 128;
    if (nextSlot > 128) nextSlot = 1;
    sendProgramChange(nextSlot - 1);
    const nextPreset = devicePresets.find((preset) => preset.slot === nextSlot);
    if (nextPreset) {
      setActivePreset({ ...nextPreset, name: getPresetDisplayName(nextPreset) });
    } else {
      setActivePreset({ ...activePreset, slot: nextSlot });
    }
  };

  const getPresetDisplayName = (preset: Preset) =>
    savedNames[preset.slot] || preset.name || formatSlotLabel(preset.slot);

  const saveEditorPresetName = () => {
    const nextName = presetNameDraft.trim();
    if (!nextName) return;
    updatePresetName(nextName);
    savePresetName(activePreset.slot, nextName);
    useMidiStore.getState().updatePresetName(activePreset.slot, nextName);
    setIsEditingPresetName(false);
  };

  const handlePresetSelect = (value: string) => {
    const slot = Number(value);
    const preset = devicePresets.find((item) => item.slot === slot);
    if (!preset || preset.slot === activePreset.slot) return;

    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }

    setActivePreset({ ...preset, name: getPresetDisplayName(preset) });
  };

  const handleCopyScene = () => {
    const targetSlot = Number(copyTargetSlot);
    const targetScene = Number(copyTargetScene);
    const target = devicePresets.find((preset) => preset.slot === targetSlot) || activePreset;
    const copied = usePresetStore.getState().copyActiveSceneTo(target, targetScene);
    const destination: Preset = {
      ...copied,
      activeScene: targetScene,
      effects: copied.scenes?.[targetScene] || copied.effects,
      name: getPresetDisplayName(target),
      lastModified: new Date(),
    };

    useMidiStore.setState((state) => ({
      devicePresets: state.devicePresets.map((preset) => preset.slot === targetSlot ? destination : preset),
    }));
    setActivePreset(destination);

    if (status === 'connected') {
      sendProgramChange(targetSlot - 1);
      sendSceneChange(targetScene);
      syncFullPreset(destination);
    }

    setIsCopySceneOpen(false);
    toast({
      title: 'Scena copiata',
      description: `${formatSlotLabel(activePreset.slot)} / Scena ${activePreset.activeScene + 1} copiata in ${formatSlotLabel(targetSlot)} / Scena ${targetScene + 1}.`,
    });
  };

  const handleSave = () => {
    if (status === 'connected') {
      syncFullPreset(activePreset);
      toast({
        title: "Hardware Save",
        description: `Salvataggio di '${activePreset.name}' in corso...`
      });
    } else {
      toast({
        title: "Local Save",
        description: "Pedaliera non connessa. Preset aggiornato localmente."
      });
    }
  };

  const handleAiModeGenerate = async () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt) return;

    // Un JSON, anche dentro un blocco markdown, è sempre un comando diretto e non passa dall'AI.
    const directJson = parseDirectJsonInput(trimmedPrompt);
    if (directJson.looksLikeJson) {
      if (directJson.error) {
        toast({
          title: "Errore nel JSON",
          description: "La configurazione diretta non è valida: " + directJson.error,
          variant: "destructive"
        });
        return;
      }

      try {
        const parsedJson = directJson.parsed;
        // Applica i parametri JSON al preset attivo
        const { updatedPreset, appliedCount, warnings } = applyJsonToPreset(activePreset, parsedJson);

        if (appliedCount > 0) {
          setActivePreset(updatedPreset);
          toast({
            title: "Parametri JSON Applicati",
            description: `${appliedCount} modifiche applicate${warnings.length ? `, ${warnings.length} valori corretti.` : '.'} Clicca SAVE per sincronizzare la pedaliera.`,
          });
          setIsAiModalOpen(false);
          setAiPrompt('');
          return;
        } else {
          toast({
            title: "JSON Valido ma Nessun Parametro Corrispondente",
            description: "Il JSON è valido ma non contiene parametri o moduli validi per MG-30.",
            variant: "destructive"
          });
          return;
        }
      } catch (err: any) {
        toast({
          title: "Errore nel JSON",
          description: "La stringa inserita inizia come un JSON ma contiene errori di sintassi: " + err.message,
          variant: "destructive"
        });
        return;
      }
    }

    // Altrimenti, procedi con la generazione tramite Intelligenza Artificiale
    setIsGenerating(true);
    setProposedPreset(null);
    setProposedNormalization(null);
    try {
      const instrumentation = [
        selectedGuitar ? `Chitarra: ${selectedGuitar.model}; pickup: ${selectedGuitar.pickups.map(pickup => `${(pickup.position || 'bridge') === 'neck' ? 'manico' : (pickup.position || 'bridge') === 'middle' ? 'centrale' : 'ponte'} ${pickup.type}${pickup.model ? ` (${pickup.model})` : ''}`).join(', ')}` : 'Chitarra: non selezionata',
        selectedAmplifier ? `Amplificatore: ${selectedAmplifier.model}; collegamento: ${selectedAmplifier.inputPosition === 'before-preamp' ? 'prima del preamplificatore' : selectedAmplifier.inputPosition === 'after-preamp' ? 'dopo il preamplificatore' : selectedAmplifier.inputPosition === 'active-cab' ? 'cassa attiva' : selectedAmplifier.inputPosition === 'passive-cab' ? 'cassa passiva' : 'cassa FRFR'}` : 'Amplificatore: non selezionato',
      ].join('\n');
      const result = await generateMG30Preset({ description: aiPrompt, instrumentation });
      setProposedPreset(result);
      setProposedNormalization(normalizePresetSuggestion(activePreset, result));
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate');
      toast({
        title: isRateLimit ? "Limite AI raggiunto" : "Errore AI",
        description: isRateLimit ? "Attendi un minuto prima di generare un altro suono." : error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyProposedPreset = () => {
    if (!proposedPreset || !proposedNormalization) return;

    const newPreset = proposedNormalization.updatedPreset;

    setActivePreset(newPreset);

    toast({
      title: "AI Tone Applied",
      description: `Il preset '${proposedPreset.name}' è pronto. Clicca SAVE per sincronizzare la pedaliera.`
    });

    setProposedPreset(null);
    setProposedNormalization(null);
    setIsAiModalOpen(false);
    setAiPrompt('');
  };

  const availableModels = selectedEffect ? MG30_MODELS[selectedEffect.type] || [] : [];
  const currentBlockColor = selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'hsl(var(--primary))';

  return (
    <AppShell>
      <div className="relative mx-auto max-w-[1440px] space-y-5 py-1 md:space-y-6 md:py-2">
        {isEditorSyncing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
            <Card role="status" aria-live="polite" className="p-8 flex flex-col items-center gap-4 shadow-2xl border-primary/40 bg-card">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-bold">Hardware Sync...</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Sincronizzazione in corso</p>
              </div>
            </Card>
          </div>
        )}

        <div className="app-surface flex flex-col gap-4 rounded-2xl p-3 md:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition-colors md:gap-4">
            <div className="flex items-center gap-2">
              <button aria-label="Preset precedente" onClick={(e) => { e.stopPropagation(); handleSlotChange('prev'); }} className="touch-target rounded-full p-2 transition-colors hover:bg-secondary"><ChevronLeft className="mx-auto h-5 w-5" /></button>
              <div className="flex h-12 w-[4.5rem] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">{formatSlotLabel(activePreset.slot)}</div>
              <button aria-label="Preset successivo" onClick={(e) => { e.stopPropagation(); handleSlotChange('next'); }} className="touch-target rounded-full p-2 transition-colors hover:bg-secondary"><ChevronRight className="mx-auto h-5 w-5" /></button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {isEditingPresetName ? (
                  <Input
                    autoFocus
                    value={presetNameDraft}
                    onChange={(event) => setPresetNameDraft(event.target.value)}
                    onBlur={saveEditorPresetName}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveEditorPresetName();
                      if (event.key === 'Escape') setIsEditingPresetName(false);
                    }}
                    className="h-8 w-full max-w-[19rem] text-lg font-bold md:text-xl"
                    aria-label="Modifica nome preset"
                  />
                ) : (
                  <Select value={String(activePreset.slot)} onValueChange={handlePresetSelect}>
                    <SelectTrigger
                      className="h-auto min-h-8 w-full max-w-[19rem] justify-start border-0 bg-transparent px-0 py-0 text-left text-lg font-bold shadow-none hover:text-primary focus:ring-0 md:text-xl"
                      aria-label="Seleziona preset"
                    >
                      <SelectValue placeholder="Seleziona preset">{getPresetDisplayName(activePreset)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(24rem,60vh)]">
                      {devicePresets.map((preset) => (
                        <SelectItem key={preset.slot} value={String(preset.slot)}>
                          <span className="font-mono text-primary">{formatSlotLabel(preset.slot)}</span>
                          <span className="ml-2">{getPresetDisplayName(preset)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!isEditingPresetName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                    aria-label="Modifica nome preset"
                    title="Modifica nome preset"
                    onClick={() => { setPresetNameDraft(activePreset.name); setIsEditingPresetName(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{status === 'connected' ? 'MG-30 CONNECTED' : 'MG-30 OFFLINE'}</Badge>
                <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-[10px] text-primary">SCENE {activePreset.activeScene + 1}</Badge>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 w-full flex-wrap items-center gap-2 md:gap-3 lg:w-auto lg:justify-end">
            {/* Scene Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1">
              <div className="px-2 text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Scenes</div>
              {[0, 1, 2].map((idx) => (
                <Button
                  key={`scene-btn-${idx}`}
                  variant={activePreset.activeScene === idx ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSceneChange(idx)}
                  className={cn(
                    "h-10 w-10 font-bold transition-all",
                    activePreset.activeScene === idx ? "bg-primary shadow-lg scale-105" : "text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>

            <Dialog open={isCopySceneOpen} onOpenChange={setIsCopySceneOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2">
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copia scena</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[430px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5 text-primary" /> Copia preset su scena</DialogTitle>
                  <DialogDescription>
                    Copia la configurazione della scena attuale su una scena dello stesso preset o di un altro codice.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    Origine: <span className="font-mono font-bold text-primary">{formatSlotLabel(activePreset.slot)}</span> · Scena {activePreset.activeScene + 1}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Preset destinazione</label>
                      <Select value={copyTargetSlot} onValueChange={setCopyTargetSlot}>
                        <SelectTrigger aria-label="Preset destinazione"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-[min(24rem,60vh)]">
                          {devicePresets.map((preset) => (
                            <SelectItem key={preset.slot} value={String(preset.slot)}>
                              <span className="font-mono text-primary">{formatSlotLabel(preset.slot)}</span>
                              <span className="ml-2">{getPresetDisplayName(preset)}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scena</label>
                      <Select value={copyTargetScene} onValueChange={setCopyTargetScene}>
                        <SelectTrigger aria-label="Scena destinazione"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2].map((scene) => <SelectItem key={scene} value={String(scene)}>Scena {scene + 1}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCopySceneOpen(false)}>Annulla</Button>
                  <Button onClick={handleCopyScene}>Copia scena</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />

            <div className="flex items-center gap-2">
              <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/50 text-primary">
                    <Sparkles className="w-4 h-4" /> AI Mode
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  {!proposedPreset ? (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Tone Designer</DialogTitle>
                        <DialogDescription>Per l’AI descrivi genericamente band, brano, periodo e tipo di chitarra. Se incolli un JSON, verrà applicato direttamente senza interpretazione AI.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Chitarra</p>
                            <Select value={selectedGuitarId || 'none'} onValueChange={(value) => selectGuitar(value === 'none' ? undefined : value)}>
                              <SelectTrigger className="bg-background/60"><SelectValue placeholder="Nessuna selezionata" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">Nessuna selezionata</SelectItem>{guitars.map(guitar => <SelectItem key={guitar.id} value={guitar.id}>{guitar.model}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Amplificatore</p>
                            <Select value={selectedAmplifierId || 'none'} onValueChange={(value) => selectAmplifier(value === 'none' ? undefined : value)}>
                              <SelectTrigger className="bg-background/60"><SelectValue placeholder="Nessuno selezionato" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">Nessuno selezionato</SelectItem>{amplifiers.map(amplifier => <SelectItem key={amplifier.id} value={amplifier.id}>{amplifier.model}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <p className="text-[11px] text-muted-foreground sm:col-span-2">La selezione viene applicata automaticamente a ogni nuova generazione AI.</p>
                        </div>
                        <Textarea
                          placeholder={`Es. per prompt AI: Suono grosso in stile Oasis, chitarra humbucker, ritmica anni '90, medi presenti e ambiente contenuto...
Es. per JSON: { "amp": { "gain": 60, "master": 80 }, "delay": { "enabled": true } }`}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="min-h-[150px] bg-secondary/20 font-mono text-sm"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAiModeGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full">
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          Genera Preset
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Preset Generato: {proposedPreset.name}</DialogTitle>
                        <DialogDescription>L'AI ha selezionato i modelli e i parametri migliori.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs italic">
                          "{proposedPreset.explanation}"
                        </div>
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <p className="section-kicker mb-2">Modifiche rilevate</p>
                          {proposedNormalization?.changes.length ? (
                            <div className="max-h-44 space-y-1.5 overflow-y-auto">
                              {proposedNormalization.changes.map((change, index) => (
                                <div key={`${change.type}-${change.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="truncate text-muted-foreground"><span className="font-semibold uppercase text-foreground">{change.type}</span> · {change.label}</span>
                                  <span className="shrink-0 font-mono text-primary">{formatValue(change.from)} → {formatValue(change.to)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nessuna modifica applicabile trovata.</p>
                          )}
                        </div>
                        {!!proposedNormalization?.warnings.length && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                            <p className="mb-1 font-semibold">Avvisi di validazione</p>
                            <ul className="list-disc space-y-1 pl-4">
                              {proposedNormalization.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => { setProposedPreset(null); setProposedNormalization(null); }}>Scarta</Button>
                        <Button onClick={applyProposedPreset} disabled={!proposedNormalization?.changes.length} className="flex-1">Applica all'Editor</Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />
              <Button variant="outline" size="icon" className="touch-target" onClick={() => syncActivePreset()} title="Sincronizza hardware"><RefreshCw className={cn("h-4 w-4", isEditorSyncing && "animate-spin")} /></Button>
              <Button variant="outline" size="icon" className="touch-target" onClick={undo} title="Annulla"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="touch-target" onClick={redo} title="Ripristina"><Redo2 className="h-4 w-4" /></Button>
              <Button className="touch-target shrink-0 gap-2 px-4 sm:px-5" onClick={handleSave}><Save className="h-4 w-4" /> <span className="hidden sm:inline">SALVA</span><span className="sm:hidden">SAVE</span></Button>
            </div>
          </div>
        </div>

        <Card className="app-surface overflow-hidden rounded-2xl bg-background/40 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 bg-secondary/20 py-3">
            <CardTitle className="section-kicker flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Signal Chain</CardTitle>
            <Button variant="ghost" size="sm" className="h-9 gap-2 text-[10px] font-bold uppercase" onClick={exitBlockEditor}><X className="h-3.5 w-3.5" /> Chiudi</Button>
          </CardHeader>
          <CardContent className="py-4">
            <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-5 md:gap-4 md:px-8 md:py-6">
              {activePreset.effects.map((effect, idx) => {
                const isSelected = selectedBlockId === effect.id;
                const blockColor = getBlockColorVar(effect.type);
                return (
                  <React.Fragment key={effect.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectBlock(effect.id, effect.type)}
                      aria-label={`Apri ${effect.type}`}
                      className={cn(
                        "relative flex h-[7.25rem] w-24 shrink-0 cursor-pointer flex-col items-stretch justify-between overflow-hidden rounded-xl border bg-secondary/40 text-left transition-colors md:h-[8.25rem] md:w-28",
                        isSelected ? "border-2 shadow-md" : "border-border/50 hover:border-primary/40",
                        !effect.enabled && "opacity-60"
                      )}
                      style={{
                        ...(isSelected ? { borderColor: `hsl(${blockColor})` } : {}),
                        ...(effect.type === 'modulation' ? { backgroundColor: `hsla(${blockColor}, 0.1)` } : {})
                      }}
                    >
                      <div className="relative min-h-0 flex-1">
                        {effect.type === 'vol' && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-4 inset-y-3 rounded-xl border bg-background/60"
                            style={{ borderColor: `hsla(${blockColor}, 0.45)`, boxShadow: `0 0 14px hsla(${blockColor}, 0.16)` }}
                          />
                        )}
                        <BlockIcon
                          type={effect.type}
                          className={cn("absolute drop-shadow-[0_0_5px_hsl(var(--icon-color)_/_0.7)]", effect.type === 'vol' ? "inset-5" : "inset-1.5")}
                          style={{ '--icon-color': blockColor, color: `hsl(${blockColor})` } as React.CSSProperties}
                        />
                        <span className={cn("absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", effect.enabled ? "bg-background/80 text-foreground" : "bg-background/80 text-muted-foreground")}>
                          {effect.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="truncate border-t border-border/50 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-foreground" style={effect.type === 'vol' ? { color: `hsl(${blockColor})` } : undefined}>
                        {effect.type === 'noise-gate' ? 'Gate' : effect.type === 'modulation' ? 'Mod' : effect.type}
                      </span>
                    </button>
                    {idx < activePreset.effects.length - 1 && <div className="flex-1 min-w-[20px] h-[2px] bg-border/40" />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedEffect && (
          <Card
            className="rounded-2xl shadow-none"
            style={{ borderColor: `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` }}
          >
            <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border/50 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <Settings2 className="w-5 h-5" style={{ color: `hsl(${getBlockColorVar(selectedEffect.type)})` }} />
                <CardTitle className="text-base uppercase md:text-lg" style={{ color: `hsl(${getBlockColorVar(selectedEffect.type)})` }}>
                  {selectedEffect?.type} <Badge variant="outline" className="text-[10px] ml-2">{selectedEffect?.model}</Badge>
                </CardTitle>
              </div>
              <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-4">
                <Select value={selectedEffect?.model} onValueChange={(val) => handleModelChange(selectedEffect!.id, selectedEffect!.type, val)}>
                  <SelectTrigger className="h-11 w-full sm:w-[220px]"><SelectValue placeholder="Model" /></SelectTrigger>
                  <SelectContent>{availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="hidden sm:inline">{selectedEffect?.enabled ? 'Attivo' : 'Bypass'}</span>
                  <Switch
                    aria-label={`${selectedEffect?.enabled ? 'Disattiva' : 'Attiva'} ${selectedEffect?.type}`}
                    checked={selectedEffect?.enabled}
                    className="data-[state=checked]:bg-transparent"
                    style={selectedEffect?.enabled ? { backgroundColor: `hsl(${getBlockColorVar(selectedEffect.type)})` } : undefined}
                    onCheckedChange={() => handleToggleBlock({ stopPropagation: () => { } } as any, selectedEffect!.id, selectedEffect!.type, selectedEffect!.enabled)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-8 lg:p-10">
              {currentModelData && (
                <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-9 sm:grid-cols-4 sm:gap-x-8 lg:grid-cols-5 lg:gap-y-12">
                  {currentModelData.parameters.map((param, index) => (
                    <div key={param.id}>
                      <RotaryKnob label={param.name} value={Number(selectedEffect.parameters[param.id.toLowerCase()] ?? param.default)} min={param.min} max={param.max} step={param.step} onChange={(v) => handleParamChange(selectedEffect.type, param.id, v, index)} color={currentBlockColor} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
