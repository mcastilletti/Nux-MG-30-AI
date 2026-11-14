/** Sagome disponibili. Ognuna è un disegno piatto fatto per l'app, senza marchi né foto di prodotti reali. */
export const DEVICE_KINDS = [
  'stomp',
  'eq',
  'wah',
  'expression',
  'amp',
  'cab-4x12',
  'cab-2x12',
  'cab-1x12',
  'cab-4x10',
  'cab-8x10',
  'acoustic',
  'user-ir',
  'mic-dynamic',
  'mic-condenser',
  'mic-ribbon',
  'send-return',
] as const;

export type DeviceKind = (typeof DEVICE_KINDS)[number];

export interface DeviceArtSpec {
  kind: DeviceKind;
  /** Manopole del pedale (1-4): solo per `stomp`. */
  knobs?: number;
  /** Id del modello di ampli: solo per `amp`. */
  model?: string;
}
