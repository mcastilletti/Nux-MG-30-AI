export type PickupType = 'single-coil' | 'humbucker';
export type PickupPosition = 'neck' | 'middle' | 'bridge';
export type AmpInputPosition = 'before-preamp' | 'after-preamp';

export interface GuitarPickup {
  id: string;
  position: PickupPosition;
  type: PickupType;
  model?: string;
}

export interface Guitar {
  id: string;
  model: string;
  pickups: GuitarPickup[];
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Amplifier {
  id: string;
  model: string;
  inputPosition: AmpInputPosition;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
