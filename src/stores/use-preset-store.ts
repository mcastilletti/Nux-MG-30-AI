import { create } from 'zustand';
import { Preset, EffectState } from '@/types/preset';
import { MG30_MODELS } from '@/lib/mg30-data';

const createDefaultEffects = (): EffectState[] => [
  { id: 'wah', type: 'wah', model: 'clyde', enabled: false, parameters: { position: 0 } },
  { id: 'ng', type: 'noise-gate', model: 'gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
  { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 50, level: 50 } },
  { id: 'efx', type: 'efx', model: 'tscream', enabled: false, parameters: { drive: 50, tone: 50, level: 50 } },
  { id: 'amp', type: 'amp', model: 'plexi100w', enabled: true, parameters: { gain: 50, master: 50, bass: 50, mid: 50, treble: 50, presence: 50 } },
  { id: 'ir', type: 'ir', model: 'ir-jz120', enabled: true, parameters: { level: 0, lowcut: 20, highcut: 20000 } },
  { id: 'sr', type: 'sr', model: 'send-return', enabled: false, parameters: { send: 100, return: 100 } },
  { id: 'mod', type: 'modulation', model: 'mod-ce1', enabled: false, parameters: { intensity: 50, depth: 50, rate: 50 } },
  { id: 'delay', type: 'delay', model: 'dly-analog', enabled: false, parameters: { repeat: 30, echo: 30, intensity: 30 } },
  { id: 'reverb', type: 'reverb', model: 'room', enabled: true, parameters: { decay: 50, tone: 50, level: 30 } },
  { id: 'vol', type: 'vol', model: 'patch-vol', enabled: true, parameters: { min: 30, max: 60 } }
];

const defaultEnabledForType = (type: string): boolean => {
  return ['noise-gate', 'amp', 'ir', 'reverb', 'vol'].includes(type);
};

export const cloneEffects = (effects: EffectState[]): EffectState[] =>
  effects.map((effect) => ({
    id: effect.id,
    type: effect.type,
    model: effect.model,
    enabled: typeof effect.enabled === 'boolean' ? effect.enabled : defaultEnabledForType(effect.type),
    parameters: { ...(effect.parameters || {}) }
  }));

export const ensurePresetScenes = (preset: Preset): Preset => {
  const activeScene = typeof preset.activeScene === 'number' ? preset.activeScene : 0;
  const baseEffects = cloneEffects(preset.effects && preset.effects.length ? preset.effects : createDefaultEffects());
  
  const existingScenes = preset.scenes || {};

  const scene0 = existingScenes[0] ? cloneEffects(existingScenes[0]) : cloneEffects(baseEffects);
  const scene1 = existingScenes[1] ? cloneEffects(existingScenes[1]) : cloneEffects(baseEffects);
  const scene2 = existingScenes[2] ? cloneEffects(existingScenes[2]) : cloneEffects(baseEffects);

  const scenes: Record<number, EffectState[]> = {
    0: scene0,
    1: scene1,
    2: scene2,
  };

  scenes[activeScene] = cloneEffects(baseEffects);

  return {
    ...preset,
    activeScene,
    effects: cloneEffects(scenes[activeScene]),
    scenes,
  };
};

const DEFAULT_PRESET: Preset = ensurePresetScenes({
  name: 'Active MG-30 Tone',
  slot: 1,
  activeScene: 0,
  category: 'Clean',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX MG-30',
  effects: createDefaultEffects()
});

const withCurrentScene = (preset: Preset, effects: EffectState[]): Preset => {
  const norm = ensurePresetScenes(preset);
  const cloned = cloneEffects(effects);
  return {
    ...norm,
    effects: cloned,
    scenes: {
      ...norm.scenes,
      [norm.activeScene]: cloneEffects(cloned),
    },
  };
};

interface PresetStore {
  activePreset: Preset;
  history: Preset[];
  historyIndex: number;
  
  setActivePreset: (preset: Preset) => void;
  updatePresetName: (name: string) => void;
  updateParameter: (effectId: string, param: string, value: number | string) => void;
  updateModel: (effectId: string, modelId: string) => void;
  updateScene: (sceneIndex: number) => void;
  toggleEffect: (effectId: string) => void;
  updateBlockStateLocally: (blockType: string, enabled: boolean) => void;
  copyScene: (sourceSceneIndex: number, targetPreset: Preset, targetSceneIndex: number) => Preset;
  copyActiveSceneTo: (target: Preset, targetScene: number) => Preset;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  activePreset: DEFAULT_PRESET,
  history: [DEFAULT_PRESET],
  historyIndex: 0,

  setActivePreset: (preset) => {
    const norm = ensurePresetScenes(preset);
    set({ activePreset: norm });
    get().saveToHistory();
  },

  updatePresetName: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { activePreset } = get();
    if (activePreset.name === trimmed) return;
    set({ activePreset: { ...activePreset, name: trimmed, lastModified: new Date() } });
    get().saveToHistory();
  },

  updateParameter: (effectId, param, value) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        if (e.parameters[param] === value) return e;
        return { ...e, parameters: { ...e.parameters, [param]: value } };
      }
      return e;
    });

    set({ activePreset: withCurrentScene({ ...activePreset, lastModified: new Date() }, newEffects) });
  },

  updateModel: (effectId, modelId) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        if (e.model === modelId) return e;
        
        const modelData = MG30_MODELS[e.type].find(m => m.id === modelId);
        const defaultParams: Record<string, number | string> = {};
        modelData?.parameters.forEach(p => {
          defaultParams[p.id] = p.default;
        });
        
        return { 
          ...e, 
          model: modelId,
          parameters: defaultParams
        };
      }
      return e;
    });
    set({ activePreset: withCurrentScene({ ...activePreset, lastModified: new Date() }, newEffects) });
    get().saveToHistory();
  },

  updateScene: (sceneIndex) => {
    const { activePreset } = get();
    if (sceneIndex < 0 || sceneIndex > 2) return;
    if (activePreset.activeScene === sceneIndex) return;

    const norm = ensurePresetScenes(activePreset);

    // Save current active scene effects
    const currentEffects = cloneEffects(norm.effects);
    const updatedScenes = {
      ...norm.scenes,
      [norm.activeScene]: currentEffects,
    };

    // Load target scene effects
    const nextEffects = cloneEffects(updatedScenes[sceneIndex]);

    const nextPreset: Preset = {
      ...norm,
      activeScene: sceneIndex,
      effects: nextEffects,
      scenes: {
        ...updatedScenes,
        [sceneIndex]: cloneEffects(nextEffects),
      },
      lastModified: new Date(),
    };

    set({ activePreset: nextPreset });
    get().saveToHistory();
  },

  toggleEffect: (effectId) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        return { ...e, enabled: !e.enabled };
      }
      return e;
    });
    set({ activePreset: withCurrentScene({ ...activePreset, lastModified: new Date() }, newEffects) });
    get().saveToHistory();
  },

  updateBlockStateLocally: (blockType, enabled) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.type === blockType) {
        if (e.enabled === enabled) return e;
        return { ...e, enabled: enabled };
      }
      return e;
    });
    set({ activePreset: withCurrentScene(activePreset, newEffects) });
  },

  copyScene: (sourceSceneIndex, targetPreset, targetSceneIndex) => {
    const { activePreset } = get();

    // Source preset is activePreset if copying from activePreset slot
    const sourcePreset = activePreset.slot === targetPreset.slot ? activePreset : targetPreset;
    const normSource = ensurePresetScenes(sourcePreset);

    // If sourceSceneIndex is current active scene, use live normSource.effects to capture latest ON/OFF states
    const rawSourceEffects = sourceSceneIndex === normSource.activeScene
      ? normSource.effects
      : (normSource.scenes[sourceSceneIndex] || normSource.effects);

    const sourceEffects = cloneEffects(rawSourceEffects);

    // Ensure target preset has scenes initialized
    const normTarget = ensurePresetScenes(targetPreset);

    // Replace target scene with exact deep copy of source scene (including ON/OFF enabled status)
    const updatedScenes = {
      ...normTarget.scenes,
      [targetSceneIndex]: cloneEffects(sourceEffects),
    };

    const isTargetActive = normTarget.activeScene === targetSceneIndex;

    const resultPreset: Preset = {
      ...normTarget,
      scenes: updatedScenes,
      effects: isTargetActive ? cloneEffects(sourceEffects) : cloneEffects(normTarget.effects),
      lastModified: new Date(),
    };

    return resultPreset;
  },

  copyActiveSceneTo: (target, targetScene) => {
    return get().copyScene(get().activePreset.activeScene, target, targetScene);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1, activePreset: history[historyIndex - 1] });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1, activePreset: history[historyIndex + 1] });
    }
  },

  saveToHistory: () => {
    const { activePreset, history, historyIndex } = get();
    const lastSaved = history[historyIndex];
    if (lastSaved && JSON.stringify(lastSaved) === JSON.stringify(activePreset)) {
      return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(activePreset)));
    if (newHistory.length > 30) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  }
}));
