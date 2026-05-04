export type MidiConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  version: string;
  state: string;
  connection: string;
}

export interface MidiPortInfo {
  inputs: MidiDevice[];
  outputs: MidiDevice[];
}

export interface MidiControlMessage {
  type: 'cc' | 'pc' | 'sysex';
  channel: number;
  number: number;
  value: number;
  data?: Uint8Array;
}
