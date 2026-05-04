export type EffectType = 'wah' | 'noise-gate' | 'compressor' | 'efx' | 'amp' | 'ir' | 'sr' | 'modulation' | 'delay' | 'reverb' | 'vol' | 'eq';

export interface EffectState {
  id: string;
  type: EffectType;
  model: string;
  enabled: boolean;
  parameters: Record<string, number | string>;
}

export interface Preset {
  id?: string;
  name: string;
  slot: number; // 1-128
  activeScene: number; // 0, 1, 2
  category: string;
  tags: string[];
  favorite: boolean;
  rating: number;
  lastModified: Date;
  ampModel: string;
  effects: EffectState[];
}

export interface PresetLibraryMetadata {
  totalPresets: number;
  favorites: number;
  categories: string[];
}
