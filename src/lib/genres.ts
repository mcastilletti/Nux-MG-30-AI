/**
 * Generi e tipi di suono usati dalle schede AI dei preset di fabbrica e dai brani.
 * Lista chiusa: l'AI può scegliere solo queste voci, così preset e brani si confrontano direttamente.
 */
export const GENRES = [
  'Rock',
  'Hard rock',
  'Metal',
  'Blues',
  'Pop',
  'Funk',
  'Jazz',
  'Country',
  'Indie / Alternative',
  'Punk',
  'Grunge',
  'Ambient / Post-rock',
  'Fusion',
  'Soul / R&B',
  'Reggae',
  'Cantautorato / Acustico',
] as const;
export type Genre = (typeof GENRES)[number];

export const SOUND_TYPES = ['Clean', 'Crunch', 'Drive', 'High gain', 'Lead', 'Acustico', 'Basso', 'Ambient / Effetti'] as const;
export type SoundType = (typeof SOUND_TYPES)[number];

export const isGenre = (value: unknown): value is Genre => typeof value === 'string' && (GENRES as readonly string[]).includes(value);
export const isSoundType = (value: unknown): value is SoundType => typeof value === 'string' && (SOUND_TYPES as readonly string[]).includes(value);
