import type { EffectState } from '@/types/preset';

/**
 * Blocchi di partenza di un preset nell'app.
 *
 * L'ordine è solo quello iniziale mostrato dall'app: sulla MG-30 la catena non è
 * fissa e i blocchi si possono spostare per ogni preset. L'app non legge né invia
 * l'ordine della catena (formato SysEx non documentato); le CC sono per tipo di
 * blocco, quindi l'ordine non influisce sugli invii MIDI.
 */
export const createDefaultEffects = (): EffectState[] => [
  { id: 'wah', type: 'wah', model: 'clyde', enabled: false, parameters: { position: 0 } },
  { id: 'ng', type: 'noise-gate', model: 'gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
  { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 50, level: 50 } },
  { id: 'efx', type: 'efx', model: 'tscream', enabled: false, parameters: { drive: 50, tone: 50, level: 50 } },
  { id: 'amp', type: 'amp', model: 'plexi100w', enabled: true, parameters: { gain: 50, master: 50, bass: 50, mid: 50, treble: 50, presence: 50 } },
  { id: 'eq', type: 'eq', model: 'eq-ge6', enabled: false, parameters: { '100hz': 50, '220hz': 50, '500hz': 50, '1.2khz': 50, '2.6khz': 50, '6.4khz': 50, level: 50 } },
  { id: 'ir', type: 'ir', model: 'ir-jz120', enabled: true, parameters: { level: 0, lowcut: 20, highcut: 20000 } },
  { id: 'sr', type: 'sr', model: 'send-return', enabled: false, parameters: { send: 100, return: 100 } },
  { id: 'mod', type: 'modulation', model: 'mod-ce1', enabled: false, parameters: { intensity: 50, depth: 50, rate: 50 } },
  { id: 'delay', type: 'delay', model: 'dly-analog', enabled: false, parameters: { repeat: 30, echo: 30, intensity: 30 } },
  { id: 'reverb', type: 'reverb', model: 'room', enabled: true, parameters: { decay: 50, tone: 50, level: 30 } },
  { id: 'vol', type: 'vol', model: 'patch-vol', enabled: true, parameters: { min: 30, max: 60 } }
];
