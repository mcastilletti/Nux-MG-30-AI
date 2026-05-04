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
  { id: 'vol', type: 'vol', model: 'patch-vol', enabled: true, parameters: { level: 100 } }
];

const DEFAULT_PRESET: Preset = {
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
};

interface PresetStore {
  activePreset: Preset;
  history: Preset[];
  historyIndex: number;
  
  setActivePreset: (preset: Preset) => void;
  updateParameter: (effectId: string, param: string, value: number | string) => void;
  updateModel: (effectId: string, modelId: string) => void;
  updateScene: (sceneIndex: number) => void;
  toggleEffect: (effectId: string) => void;
  updateBlockStateLocally: (blockType: string, enabled: boolean) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  activePreset: DEFAULT_PRESET,
  history: [DEFAULT_PRESET],
  historyIndex: 0,

  setActivePreset: (preset) => {
    set({ activePreset: preset });
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

    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
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
    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
    get().saveToHistory();
  },

  updateScene: (sceneIndex) => {
    const { activePreset } = get();
    if (activePreset.activeScene === sceneIndex) return;
    set({ activePreset: { ...activePreset, activeScene: sceneIndex, lastModified: new Date() } });
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
    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
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
    set({ activePreset: { ...activePreset, effects: newEffects } });
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
