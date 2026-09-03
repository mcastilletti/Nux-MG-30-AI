import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { EffectType, Preset, EffectState } from '@/types/preset';
import { usePresetStore } from './use-preset-store';
import { MG30_MODELS } from '@/lib/mg30-data';

// Tabella CC per Modelli e Bypass
const BLOCK_MODEL_CC: Record<string, number> = {
  'wah': 0,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'noise-gate': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9
};

const SCENE_SELECT_CC = 80;

// Offset base per lo stato ON
const BLOCK_MODEL_OFFSET: Record<string, number> = {
  'wah': 65,
  'compressor': 65,
  'efx': 1,
  'amp': 1,
  'eq': 1,
  'noise-gate': 1,
  'modulation': 65,
  'delay': 1,
  'reverb': 1,
  'ir': 1
};

// CC per i parametri dei blocchi
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'wah': [12],
  'compressor': [14, 15, 16],
  'efx': [18, 19, 20, 21, 22],
  'amp': [24, 25, 26, 27, 28, 29, 30],
  'eq': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
  'noise-gate': [44, 45],
  'modulation': [48, 49, 50, 51, 52],
  'delay': [54, 55, 56, 57, 58, 59, 60],
  'reverb': [62, 63, 64],
  'ir': [66, 67, 68, 69, 70],
  'sr': [72],
  // PATCH VOL: accesso editor B0 4E 0B, MIN su 4B (0..50), MAX su 4C (0..64)
  'vol': [75, 76]
};

const BLOCK_INDEX_MAP: Record<string, number> = {
  'wah': 0,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'noise-gate': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9
};

/** Converte il valore usato dall'editor nel range MIDI 0-127. */
const parameterToMidiValue = (value: number, parameter: { id?: string; min: number; max: number; unit?: string }) => {
  const clamped = Math.min(parameter.max, Math.max(parameter.min, value));
  // PATCH VOL usa due scale hardware distinte: MIN 0..50 e MAX 51..100
  // (il MAX viene rappresentato dalla MG-30 su CC 76 nel range 0..100).
  if (parameter.id === 'min' && parameter.min === 0 && parameter.max === 50) {
    return Math.round(clamped);
  }
  if (parameter.id === 'max' && parameter.min === 51 && parameter.max === 100) {
    return Math.round(((clamped - 51) / 49) * 100);
  }
  // IR Level usa il CC 68 e la NUX lo rappresenta nel range 0..100,
  // mentre l'Editor mostra il valore equivalente -12..+12 dB.
  if (parameter.id === 'level' && parameter.min === -12 && parameter.max === 12) {
    return Math.round(((clamped - parameter.min) / (parameter.max - parameter.min)) * 100);
  }
  if (parameter.min === 0 && parameter.max === 127) return Math.round(clamped);
  if (parameter.max === parameter.min) return 0;
  return Math.round(((clamped - parameter.min) / (parameter.max - parameter.min)) * 127);
};

const blockStateMidiValue = (blockType: string, modelIndex: number, enabled: boolean) => {
  const baseOffset = BLOCK_MODEL_OFFSET[blockType] || 1;
  const onValue = modelIndex + baseOffset;

  // Il Wah usa la polarità inversa per il bypass rispetto agli altri blocchi.
  if (blockType === 'wah') return enabled ? onValue - 64 : onValue;
  if (baseOffset >= 64) return enabled ? onValue : onValue - 64;
  return enabled ? onValue : onValue + 64;
};

const SELECT_BLOCK_CC = 75; 
const ENTER_EDITOR_CC = 78;

const formatSlotLabel = (slot: number) => {
  const bank = Math.floor((slot - 1) / 4) + 1;
  const sub = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(bank).padStart(2, '0')}${sub}`;
};

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

const INITIAL_PRESETS: Preset[] = Array.from({ length: 128 }, (_, i) => ({
  slot: i + 1,
  activeScene: 0,
  name: `Preset ${formatSlotLabel(i + 1)}`,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX MG-30',
  effects: createDefaultEffects()
}));

interface MidiStore {
  status: MidiConnectionStatus;
  input: MIDIInput | null;
  output: MIDIOutput | null;
  availableDevices: { inputs: MidiDevice[], outputs: MidiDevice[] };
  devicePresets: Preset[];
  isSyncing: boolean;
  isEditorSyncing: boolean;
  isInitializing: boolean;
  syncProgress: number;
  lastError: string | null;
  
  midiLog: string[];
  addMidiLog: (msg: string) => void;
  clearMidiLog: () => void;

  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number) => void;
  sendSceneChange: (sceneIndex: number) => void;
  sendKnobParameter: (blockType: string, knobIndex: number, value: number) => void;
  sendModelChange: (blockType: string, modelId: string) => void;
  sendPresetName: (name: string) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  selectBlock: (blockType: string) => void;
  enterBlockEditor: (blockType: string) => void;
  exitBlockEditor: () => void;
  syncBlockParameters: (blockType: string, parameters: Record<string, any>) => void;
  syncFullPreset: (preset: Preset) => void;
  refreshDevices: () => void;
  syncPresets: (force?: boolean) => Promise<void>;
  syncActivePreset: () => void;
  requestPresetName: () => void;
  updatePresetName: (slot: number, newName: string) => void;
  handleIncomingMidi: (message: MIDIMessageEvent) => void;
}

export const useMidiStore = create<MidiStore>((set, get) => ({
  status: 'disconnected',
  input: null,
  output: null,
  availableDevices: { inputs: [], outputs: [] },
  devicePresets: INITIAL_PRESETS,
  isSyncing: false,
  isEditorSyncing: false,
  isInitializing: false,
  syncProgress: 0,
  lastError: null,
  midiLog: [],

  addMidiLog: (msg) => set(state => ({ midiLog: [msg, ...state.midiLog].slice(0, 200) })),
  clearMidiLog: () => set({ midiLog: [] }),

  initialize: async () => {
    const state = get();
    if (state.isInitializing || state.status === 'connected') return;
    
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      set({ status: 'error', lastError: 'Web MIDI API non supportata' });
      return;
    }

    set({ isInitializing: true, status: 'connecting' });

    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      
      const updateDevices = () => {
        const inputs: MidiDevice[] = [];
        const outputs: MidiDevice[] = [];
        
        midiAccess.inputs.forEach(port => {
          inputs.push({ id: port.id, name: port.name || 'Unknown', manufacturer: port.manufacturer || 'Unknown', version: port.version || 'Unknown', state: port.state, connection: port.connection });
        });

        midiAccess.outputs.forEach(port => {
          outputs.push({ id: port.id, name: port.name || 'Unknown', manufacturer: port.manufacturer || 'Unknown', version: port.version || 'Unknown', state: port.state, connection: port.connection });
        });

        set({ availableDevices: { inputs, outputs } });

        const nuxInput = Array.from(midiAccess.inputs.values()).find(i => i.name?.toUpperCase().includes('NUX') || i.name?.toUpperCase().includes('MG-30'));
        const nuxOutput = Array.from(midiAccess.outputs.values()).find(o => o.name?.toUpperCase().includes('NUX') || o.name?.toUpperCase().includes('MG-30'));

        if (nuxInput && nuxOutput) {
          nuxInput.onmidimessage = (msg) => get().handleIncomingMidi(msg);
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected', isInitializing: false });
        } else {
          set({ status: 'disconnected', isInitializing: false });
        }
      };

      midiAccess.onstatechange = updateDevices;
      updateDevices();
    } catch (err) {
      set({ status: 'error', lastError: 'Errore accesso MIDI', isInitializing: false });
    }
  },

  handleIncomingMidi: (message) => {
    const data = message.data;
    if (!data) return;
    const statusByte = data[0] & 0xF0;

    // Log every raw incoming message as HEX
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    get().addMidiLog(`[IN] ${hex}`);

    // Gestione SysEx messages
    if (data[0] === 0xF0 && data[data.length - 1] === 0xF7) {
      const sysexData = Array.from(data);
      console.log('[MIDI SysEx IN]', hex);

      // Riconosce qualsiasi risposta NUX con header F0 00 20 6B
      const isNuxMessage = sysexData.length >= 6 &&
        sysexData[1] === 0x00 &&
        sysexData[2] === 0x20 &&
        sysexData[3] === 0x6B;

      if (isNuxMessage) {
        console.log('[MIDI] NUX SysEx - comando:', sysexData[5]?.toString(16).toUpperCase(), '- lunghezza:', sysexData.length);

        // Prova a estrarre un nome leggibile da qualsiasi offset a partire da byte 6
        // Il nome del preset NUX è tipicamente 16 byte ASCII (0x20-0x7E)
        for (let startOffset = 6; startOffset <= Math.min(12, sysexData.length - 8); startOffset++) {
          let candidate = '';
          for (let i = startOffset; i < Math.min(startOffset + 16, sysexData.length - 1); i++) {
            const c = sysexData[i];
            if (c >= 0x20 && c <= 0x7E) {
              candidate += String.fromCharCode(c);
            } else if (c === 0x00) {
              break; // null terminator
            } else {
              candidate = ''; // byte non stampabile interrompe la sequenza
              break;
            }
          }
          candidate = candidate.trim();
          if (candidate.length >= 3) {
            console.log(`[MIDI] Possibile nome preset (offset ${startOffset}): "${candidate}"`);
            const activePreset = usePresetStore.getState().activePreset;
            if (activePreset) {
              get().updatePresetName(activePreset.slot, candidate);
              usePresetStore.setState(s => ({ activePreset: { ...s.activePreset, name: candidate } }));
            }
            break; // usa il primo candidato valido
          }
        }
      }
    }

    if (statusByte === 0xC0) {
      const pc = data[1];
      const slot = pc + 1;
      console.log('[MIDI] Program Change -> slot', slot);
      const activePreset = usePresetStore.getState().activePreset;
      const existingPreset = get().devicePresets.find(p => p.slot === slot);
      
      if (activePreset.slot !== slot) {
        usePresetStore.getState().setActivePreset(existingPreset || { ...activePreset, slot });
        setTimeout(() => get().syncActivePreset(), 100);
      }
    }
  },

  syncActivePreset: () => {
    const { output, isEditorSyncing } = get();
    if (!output || isEditorSyncing) return;
    
    set({ isEditorSyncing: true });
    // Request preset data (includes name)
    output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7]);
    setTimeout(() => set({ isEditorSyncing: false }), 2000);
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
  },

  sendProgramChange: (pc) => {
    const { output, isSyncing } = get();
    if (output) {
      output.send([0xC0, pc]);
      if (!isSyncing) {
        setTimeout(() => get().syncActivePreset(), 200);
      }
    }
  },

  sendSceneChange: (sceneIndex) => {
    get().sendControlChange(SCENE_SELECT_CC, sceneIndex);
  },

  sendPresetName: (name: string) => {
    const { output } = get();
    if (!output) return;
    const header = [0xF0, 0x00, 0x20, 0x6B, 0x01, 0x01, 0x07];
    const nameBytes = new Array(16).fill(0x20);
    for (let i = 0; i < Math.min(name.length, 16); i++) {
      nameBytes[i] = name.charCodeAt(i) & 0x7F;
    }
    const footer = [0xF7];
    const message = new Uint8Array([...header, ...nameBytes, ...footer]);
    output.send(message);
  },

  sendKnobParameter: (blockType, knobIndex, value) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (ccs && ccs[knobIndex] !== undefined) {
      const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
      const model = effect && MG30_MODELS[effect.type]?.find(m => m.id === effect.model);
      const parameter = model?.parameters[knobIndex];
      get().sendControlChange(ccs[knobIndex], parameter ? parameterToMidiValue(value, parameter) : value);
    }
  },

  sendModelChange: (blockType, modelId) => {
    const { sendControlChange, enterBlockEditor } = get();
    const cc = BLOCK_MODEL_CC[blockType];
    if (cc === undefined) return;

    const models = MG30_MODELS[blockType as EffectType];
    const modelIndex = models?.findIndex(m => m.id === modelId) ?? 0;
    const safeIndex = modelIndex === -1 ? 0 : modelIndex;

    const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
    const isEnabled = effect?.enabled ?? true;
    const midiValue = blockStateMidiValue(blockType, safeIndex, isEnabled);
    
    enterBlockEditor(blockType);
    setTimeout(() => sendControlChange(cc, midiValue), 400);
  },

  toggleBlock: (blockType, enabled) => {
    const cc = BLOCK_MODEL_CC[blockType];
    if (cc === undefined) return;

    const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
    if (!effect) return;

    const models = MG30_MODELS[blockType as EffectType];
    const modelIndex = models?.findIndex(m => m.id === effect.model) ?? 0;
    const safeIndex = modelIndex === -1 ? 0 : modelIndex;
    const midiValue = blockStateMidiValue(blockType, safeIndex, enabled);

    get().sendControlChange(cc, midiValue);
  },

  selectBlock: (blockType) => {
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) get().sendControlChange(SELECT_BLOCK_CC, index);
  },

  enterBlockEditor: (blockType) => {
    if (blockType === 'vol') {
      // La pagina PATCH VOL si apre con B0 4E 0B.
      get().sendControlChange(78, 11);
      return;
    }
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) {
      get().sendControlChange(SELECT_BLOCK_CC, index);
      setTimeout(() => get().sendControlChange(ENTER_EDITOR_CC, index), 250);
    }
  },

  exitBlockEditor: () => {
    get().sendControlChange(ENTER_EDITOR_CC, 127);
  },

  syncBlockParameters: (blockType, parameters) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (!ccs) return;

    const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
    if (!effect) return;

    const modelData = MG30_MODELS[effect.type]?.find(m => m.id === effect.model);
    if (!modelData) return;

    modelData.parameters.forEach((param, index) => {
      const val = Number(parameters[param.id.toLowerCase()] ?? param.default);
      if (ccs[index] !== undefined) {
        const midiValue = parameterToMidiValue(val, param);
        setTimeout(() => get().sendControlChange(ccs[index], midiValue), index * 100);
      }
    });
  },

  syncFullPreset: (preset) => {
    const { sendModelChange, toggleBlock, syncBlockParameters, sendPresetName, isEditorSyncing } = get();
    if (isEditorSyncing) return;

    set({ isEditorSyncing: true });

    sendPresetName(preset.name);

    preset.effects.forEach((e, idx) => {
      setTimeout(() => {
        get().enterBlockEditor(e.type);
        setTimeout(() => {
          sendModelChange(e.type, e.model);
          setTimeout(() => {
            toggleBlock(e.type, e.enabled);
            setTimeout(() => {
              syncBlockParameters(e.type, e.parameters);
            }, 300);
          }, 300);
        }, 300);
      }, idx * 1500);
    });

    const totalTime = preset.effects.length * 1500 + 500;
    setTimeout(() => set({ isEditorSyncing: false }), totalTime);
  },


  syncPresets: async () => {
    if (get().isSyncing) return;
    
    set({ isSyncing: true, syncProgress: 0 });
    for (let i = 1; i <= 128; i++) {
      if (!get().isSyncing) break;
      set({ syncProgress: Math.round((i / 128) * 100) });
      get().sendProgramChange(i - 1);
      await new Promise(r => setTimeout(r, 300));
    }
    set({ isSyncing: false });
  },


  updatePresetName: (slot, newName) => {
    set(state => ({ devicePresets: state.devicePresets.map(p => p.slot === slot ? { ...p, name: newName } : p) }));
  },

  requestPresetName: () => {
    const { output } = get();
    if (!output) return;
    
    // Request preset name specifically
    // Based on QuickTone protocol, command 0x01 0x07 might be for names
    output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x01, 0x07, 0xF7]);
  },

  refreshDevices: () => get().initialize()
}));
