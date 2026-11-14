/** Sagome disponibili. Ognuna è un disegno piatto fatto per l'app, senza marchi né foto di prodotti reali. */
export const DEVICE_KINDS = [
  'stomp',
  'eq',
  'wah',
  'expression',
  'amp',
  'cab',
  'acoustic',
  'user-ir',
  'mic-sm57',
  'mic-md421',
  'mic-beta52',
  'mic-u87',
  'mic-c414',
  'mic-c3000',
  'mic-r121',
  'mic-r122',
  'send-return',
] as const;

export type DeviceKind = (typeof DEVICE_KINDS)[number];

export interface DeviceArtSpec {
  kind: DeviceKind;
  /** Manopole del pedale (1-4): solo per `stomp`. */
  knobs?: number;
  /** Id del modello (ampli, cassa, pedale, wah, EQ): serve a disegnare quello giusto. */
  model?: string;
}
