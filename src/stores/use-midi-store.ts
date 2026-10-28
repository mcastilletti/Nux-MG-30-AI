import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { EffectType, Preset, EffectState } from '@/types/preset';
import { usePresetStore } from './use-preset-store';
import { MG30_MODELS } from '@/lib/mg30-data';
import { formatSlotLabel } from '@/lib/slot';
import { createDefaultEffects } from '@/lib/default-effects';
import { debugLog, useMidiLogStore } from './use-midi-log-store';

// Mappa MIDI dalla tabella ufficiale delle impostazioni MIDI di QuickTone (MG-30).

// Modello + ON/OFF del blocco: valore = indice modello + 1, +64 se in bypass.
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
  'ir': 9,
  'sr': 10,
  'vol': 11
};

const SCENE_SELECT_CC = 80;

const ccRange = (first: number, count: number) => Array.from({ length: count }, (_, i) => first + i);

// CC delle manopole di ciascun blocco (Knob 1..N), tutte in scala 0..100.
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'wah': ccRange(12, 2),
  'compressor': ccRange(14, 4),
  'efx': ccRange(18, 6),
  'amp': ccRange(24, 8),
  'eq': ccRange(32, 12),
  'noise-gate': ccRange(44, 4),
  'modulation': ccRange(48, 6),
  'delay': ccRange(54, 8),
  'reverb': ccRange(62, 4),
  'ir': ccRange(66, 6),
  'sr': [72, 73],
  // Patch Min / Patch Max
  'vol': [75, 76]
};

/** Posizione (0-based) della manopola sulla pedaliera, cioè l'indice in BLOCK_PARAM_CCS. */
const knobSlot = (parameter: { knob?: number }, index: number) => (parameter.knob ?? index + 1) - 1;

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
  'ir': 9,
  'sr': 10,
  'vol': 11
};

type MidiParam = { id?: string; min: number; max: number; options?: string[] };

/**
 * Valore dell'editor → valore CC (0..100). Le manopole della MG-30 sono tutte 0..100
 * (gain al massimo = CC 100): un range diverso nell'editor (es. IR Level -12..+12 dB,
 * Lo Cut 20..1000 Hz) si riporta su 0..100. I selettori (Sub Div, Mic…) inviano l'indice.
 */
export const parameterToMidiValue = (value: number, parameter: MidiParam) => {
  const clamped = Math.min(parameter.max, Math.max(parameter.min, value));
  if (parameter.options) return Math.round(clamped);
  // PATCH VOL MIN: la pedaliera lo espone come 0..50, lo stesso valore dell'editor.
  if (parameter.id === 'min' && parameter.min === 0 && parameter.max === 50) return Math.round(clamped);
  if (parameter.max === parameter.min) return 0;
  return Math.round(((clamped - parameter.min) / (parameter.max - parameter.min)) * 100);
};

/** Inverso di parameterToMidiValue: valore CC ricevuto dalla pedaliera → valore dell'editor. */
export const midiValueToParameter = (value: number, parameter: MidiParam) => {
  if (parameter.options) return Math.min(parameter.max, Math.max(parameter.min, value));
  if (parameter.id === 'min' && parameter.min === 0 && parameter.max === 50) return Math.min(50, value);
  if (parameter.max === parameter.min) return parameter.min;
  const ratio = Math.min(100, Math.max(0, value)) / 100;
  return Math.round(parameter.min + ratio * (parameter.max - parameter.min));
};

/** Valore del CC di blocco: indice modello + 1 se acceso, +64 se in bypass (uguale per tutti i blocchi). */
const blockStateMidiValue = (modelIndex: number, enabled: boolean) => modelIndex + 1 + (enabled ? 0 : 64);

/**
 * Inverso di blockStateMidiValue: dal CC ricevuto (es. B0 03 1E = amp acceso, B0 03 5E = stesso
 * amp in bypass) ricava ON/OFF e, se l'app conosce quel modello, il modello. La pedaliera può
 * avere più modelli dell'app (es. 35 amp): in quel caso si aggiorna solo ON/OFF.
 */
export const decodeBlockState = (blockType: string, value: number): { modelId?: string; enabled: boolean } | null => {
  if (value < 1 || value > 127 || value === 64) return null;
  const enabled = value < 64;
  const modelIndex = (enabled ? value : value - 64) - 1;
  const model = MG30_MODELS[blockType as EffectType]?.[modelIndex];
  return { modelId: model?.id, enabled };
};

const BLOCK_TYPE_BY_MODEL_CC: Record<number, string> = Object.fromEntries(
  Object.entries(BLOCK_MODEL_CC).map(([type, cc]) => [cc, type]),
);

// "Current Block": seleziona il blocco mostrato sulla pedaliera. (Il CC 75 è PATCH MIN, non la
// selezione del blocco: usarlo per selezionare cambiava il volume minimo del preset.)
const CURRENT_BLOCK_CC = 78;


export const INITIAL_PRESETS: Preset[] = Array.from({ length: 128 }, (_, i) => ({
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
  /** Vero solo mentre syncFullPreset scrive il preset sulla pedaliera. */
  isPushingPreset: boolean;
  /** Vero mentre l'app chiede alla pedaliera lo stato di ogni blocco (readPresetFromPedal). */
  isReadingPreset: boolean;
  isInitializing: boolean;
  syncProgress: number;
  lastError: string | null;

  /** Scrivono nel registro separato (`useMidiLogStore`): non aggiornano questo store. */
  addMidiLog: (msg: string) => void;
  addMidiOutLog: (msg: string) => void;

  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number, skipAutoSync?: boolean) => void;
  sendSceneChange: (sceneIndex: number) => void;
  sendKnobParameter: (blockType: string, knobIndex: number, value: number) => void;
  sendModelChange: (blockType: string, modelId: string, skipEnter?: boolean) => void;
  sendPresetName: (name: string) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  selectBlock: (blockType: string) => void;
  enterBlockEditor: (blockType: string) => void;
  exitBlockEditor: () => void;
  syncBlockParameters: (blockType: string, parameters: Record<string, any>) => void;
  syncFullPreset: (preset: Preset) => void;
  readPresetFromPedal: (finalBlockType?: string) => void;
  refreshDevices: () => void;
  syncPresets: (force?: boolean) => Promise<void>;
  syncActivePreset: () => void;
  requestPresetName: () => void;
  updatePresetName: (slot: number, newName: string) => void;
  commitPreset: (preset: Preset) => void;
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
  isPushingPreset: false,
  isReadingPreset: false,
  isInitializing: false,
  syncProgress: 0,
  lastError: null,

  addMidiLog: (msg) => useMidiLogStore.getState().addMidiLog(msg),
  addMidiOutLog: (msg) => useMidiLogStore.getState().addMidiOutLog(msg),

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

    // Gestione Control Change messages per sincronizzazione parametri.
    // Mentre syncFullPreset sta scrivendo (es. appena dopo "copia scena"), la pedaliera
    // rispecchia in CC lo stato che ancora NON ha ricevuto i nostri valori nuovi: se li
    // applichiamo qui sovrascriviamo nell'app i parametri appena copiati con quelli vecchi.
    // (Non isEditorSyncing: resta attivo 2s dopo ogni cambio preset, proprio quando la
    // pedaliera invia i valori del preset appena caricato.)
    if (statusByte === 0xB0 && !get().isPushingPreset) {
      const cc = data[1];
      const value = data[2];
      debugLog('[MIDI] CC received:', cc, 'value:', value);

      // Modello e ON/OFF del blocco (stessi CC che l'app invia): li riporta nell'editor.
      const stateBlockType = BLOCK_TYPE_BY_MODEL_CC[cc];
      if (stateBlockType) {
        const decoded = decodeBlockState(stateBlockType, value);
        const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === stateBlockType);
        if (decoded && effect) {
          if (decoded.modelId && effect.model !== decoded.modelId) usePresetStore.getState().updateModel(effect.id, decoded.modelId);
          if (effect.enabled !== decoded.enabled) usePresetStore.getState().updateBlockStateLocally(stateBlockType, decoded.enabled);
        }
      }

      // Mappa inversa dei CC per trovare il tipo di blocco e la manopola
      const findBlockAndKnob = (ccNumber: number) => {
        for (const [blockType, ccs] of Object.entries(BLOCK_PARAM_CCS)) {
          const slot = ccs.indexOf(ccNumber);
          if (slot !== -1) return { blockType, slot };
        }
        return null;
      };

      const blockInfo = findBlockAndKnob(cc);
      if (blockInfo) {
        const { blockType, slot } = blockInfo;
        const activePreset = usePresetStore.getState().activePreset;
        const effect = activePreset.effects.find(e => e.type === blockType);

        if (effect) {
          const model = MG30_MODELS[effect.type]?.find(m => m.id === effect.model);
          const param = model?.parameters.find((p, i) => knobSlot(p, i) === slot);
          if (param) {
            const convertedValue = midiValueToParameter(value, param);
            debugLog(`[MIDI] Syncing ${blockType}.${param.id}: ${value} -> ${convertedValue}`);
            
            // Aggiorna il preset nello store
            usePresetStore.getState().updateParameter(effect.id, param.id, convertedValue);
          }
        }
      }
    }

    // Gestione SysEx messages
    if (data[0] === 0xF0 && data[data.length - 1] === 0xF7) {
      const sysexData = Array.from(data);
      debugLog('[MIDI SysEx IN]', hex);

      // Riconosce qualsiasi risposta NUX con header F0 00 20 6B
      const isNuxMessage = sysexData.length >= 6 &&
        sysexData[1] === 0x00 &&
        sysexData[2] === 0x20 &&
        sysexData[3] === 0x6B;

      if (isNuxMessage) {
        debugLog('[MIDI] NUX SysEx - comando:', sysexData[5]?.toString(16).toUpperCase(), '- lunghezza:', sysexData.length);

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
            debugLog(`[MIDI] Possibile nome preset (offset ${startOffset}): "${candidate}"`);
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
      debugLog('[MIDI] Program Change -> slot', slot);
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
    const message = [0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7];
    output.send(message);
    const hex = message.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    get().addMidiOutLog(`[OUT] ${hex}`);
    setTimeout(() => set({ isEditorSyncing: false }), 2000);
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) {
      const message = [0xB0, cc, Math.min(127, Math.max(0, value))];
      output.send(message);
      const hex = message.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      get().addMidiOutLog(`[OUT] ${hex}`);
    }
  },

  sendProgramChange: (pc, skipAutoSync) => {
    const { output, isSyncing } = get();
    if (output) {
      const message = [0xC0, pc];
      output.send(message);
      const hex = message.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      get().addMidiOutLog(`[OUT] ${hex}`);
      // skipAutoSync evita di impostare isEditorSyncing (per 2s) quando il chiamante
      // deve subito dopo eseguire un syncFullPreset verso lo stesso slot (es. copia scena):
      // altrimenti syncFullPreset troverebbe isEditorSyncing=true e non invierebbe nulla.
      if (!isSyncing && !skipAutoSync) {
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
    const hex = Array.from(message).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    get().addMidiOutLog(`[OUT] ${hex}`);
  },

  // paramIndex: posizione del parametro nel modello dell'app; la CC dipende dalla manopola sulla pedaliera.
  sendKnobParameter: (blockType, paramIndex, value) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (!ccs) return;
    const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
    const model = effect && MG30_MODELS[effect.type]?.find(m => m.id === effect.model);
    const parameter = model?.parameters[paramIndex];
    const cc = ccs[parameter ? knobSlot(parameter, paramIndex) : paramIndex];
    if (cc === undefined) return;
    get().sendControlChange(cc, parameter ? parameterToMidiValue(value, parameter) : value);
  },

  // skipEnter: il chiamante (syncFullPreset) ha già aperto ed atteso l'editor del blocco;
  // entrare di nuovo qui (SELECT+ENTER CC in corsa con quelli già inviati) confondeva la
  // pedaliera sul blocco "a fuoco", facendo arrivare il cambio modello sul blocco sbagliato
  // (sintomo: dopo "copia scena" la pedaliera mostra amplificatori/effetti diversi da quelli copiati).
  sendModelChange: (blockType, modelId, skipEnter) => {
    const { sendControlChange, enterBlockEditor } = get();
    const cc = BLOCK_MODEL_CC[blockType];
    if (cc === undefined) return;

    const models = MG30_MODELS[blockType as EffectType];
    const modelIndex = models?.findIndex(m => m.id === modelId) ?? 0;
    const safeIndex = modelIndex === -1 ? 0 : modelIndex;

    const effect = usePresetStore.getState().activePreset.effects.find(e => e.type === blockType);
    const isEnabled = effect?.enabled ?? true;
    const midiValue = blockStateMidiValue(safeIndex, isEnabled);

    if (skipEnter) {
      sendControlChange(cc, midiValue);
      return;
    }
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
    const midiValue = blockStateMidiValue(safeIndex, enabled);

    get().sendControlChange(cc, midiValue);
  },

  selectBlock: (blockType) => {
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) get().sendControlChange(CURRENT_BLOCK_CC, index);
  },

  enterBlockEditor: (blockType) => get().selectBlock(blockType),

  exitBlockEditor: () => {
    get().sendControlChange(CURRENT_BLOCK_CC, 127);
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
      const cc = ccs[knobSlot(param, index)];
      if (cc !== undefined) {
        const midiValue = parameterToMidiValue(val, param);
        setTimeout(() => get().sendControlChange(cc, midiValue), index * 100);
      }
    });
  },

  // Chiede alla pedaliera lo stato di ogni blocco selezionandolo (Current Block): quando un
  // blocco diventa quello corrente la MG-30 invia in CC modello, ON/OFF e manopole, che
  // handleIncomingMidi riporta nella scena attiva dell'editor.
  readPresetFromPedal: (finalBlockType = 'amp') => {
    const { output, isPushingPreset, isReadingPreset } = get();
    if (!output || isPushingPreset || isReadingPreset) return;
    set({ isReadingPreset: true });
    const STEP_MS = 250;
    const blocks = Object.keys(BLOCK_INDEX_MAP);
    blocks.forEach((type, i) => setTimeout(() => get().selectBlock(type), i * STEP_MS));
    setTimeout(() => {
      get().selectBlock(finalBlockType);
      set({ isReadingPreset: false });
    }, blocks.length * STEP_MS + STEP_MS);
  },

  syncFullPreset: (preset) => {
    const { sendModelChange, toggleBlock, syncBlockParameters, sendPresetName, isEditorSyncing } = get();
    if (isEditorSyncing) return;

    set({ isEditorSyncing: true, isPushingPreset: true });

    sendPresetName(preset.name);

    // Finestra per blocco: entra una sola volta nell'editor (niente doppio SELECT/ENTER CC,
    // vedi commento su sendModelChange) e lascia margine per il blocco con più parametri
    // (eq: 11 CC a 100ms l'uno) prima che il blocco successivo prenda il focus sulla pedaliera.
    const BLOCK_WINDOW_MS = 2000;

    preset.effects.forEach((e, idx) => {
      setTimeout(() => {
        get().enterBlockEditor(e.type);
        setTimeout(() => {
          sendModelChange(e.type, e.model, true);
          setTimeout(() => {
            toggleBlock(e.type, e.enabled);
            setTimeout(() => {
              syncBlockParameters(e.type, e.parameters);
            }, 300);
          }, 300);
        }, 300);
      }, idx * BLOCK_WINDOW_MS);
    });

    const totalTime = preset.effects.length * BLOCK_WINDOW_MS + 500;
    setTimeout(() => set({ isEditorSyncing: false, isPushingPreset: false }), totalTime);
  },


  syncPresets: async () => {
    if (get().isSyncing) return;

    set({ isSyncing: true, syncProgress: 0 });

    // Sincronizza tutti i preset attivandoli uno alla volta e richiedendo i dati
    for (let i = 1; i <= 128; i++) {
      if (!get().isSyncing) break;
      set({ syncProgress: Math.round((i / 128) * 100) });

      // Attiva il preset
      get().sendProgramChange(i - 1);

      // Richiede i dati del preset (SysEx)
      get().syncActivePreset();

      // Attendi per permettere alla pedaliera di rispondere
      await new Promise(r => setTimeout(r, 500));
    }

    set({ isSyncing: false });
  },


  updatePresetName: (slot, newName) => {
    set(state => ({ devicePresets: state.devicePresets.map(p => p.slot === slot ? { ...p, name: newName } : p) }));
  },

  // Rispecchia lo stato live dell'editor (usePresetStore.activePreset) nella libreria
  // devicePresets, che altrimenti resterebbe uno snapshot stantio: senza questo,
  // cambiare slot o copiare una scena perde tutte le modifiche non ancora "salvate".
  commitPreset: (preset) => {
    set(state => ({ devicePresets: state.devicePresets.map(p => p.slot === preset.slot ? { ...preset } : p) }));
  },

  requestPresetName: () => {
    const { output } = get();
    if (!output) return;

    // Request preset name specifically
    // Based on QuickTone protocol, command 0x01 0x07 might be for names
    const message = [0xF0, 0x00, 0x20, 0x6B, 0x01, 0x01, 0x07, 0xF7];
    output.send(message);
    const hex = message.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    get().addMidiOutLog(`[OUT] ${hex}`);
  },

  refreshDevices: () => get().initialize()
}));
