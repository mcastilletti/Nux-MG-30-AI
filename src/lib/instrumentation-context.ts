import type { Amplifier, AmpInputPosition, Guitar, PickupPosition } from '@/types/instrumentation';

// Dati da "Caratteristiche Epiphone ES-335 2022" e "FRFR-112 MK2 spec" (Headrush, Technical Specifications).
export const DEFAULT_GUITAR_DESCRIPTION =
  'Chitarra: Epiphone ES-335 (semi-hollow, corpo in acero laminato con blocco centrale in acero, manico in mogano profilo Rounded "C", scala 24.72", 22 tasti medium jumbo); pickup: manico humbucker (Alnico Classic PRO), ponte humbucker (Alnico Classic PRO); controlli 2 volume, 2 tone, selettore 3 vie; corde Ernie Ball .010-.046';

export const DEFAULT_AMPLIFIER_DESCRIPTION =
  'Amplificatore: Headrush FRFR-112; collegamento: cassa FRFR (cassa attiva full-range: woofer 12", driver HF con uscita da 1", crossover 2 kHz, risposta in frequenza 53 Hz-20 kHz ±3 dB, gamma 44 Hz-20 kHz -10 dB, copertura 90°x60°, interruttore HPF 100 Hz di stato non noto)';

const DEFAULT_GUITAR_KEY = 'es335';
const DEFAULT_AMPLIFIER_KEY = 'frfr112';

const PICKUP_POSITION_LABELS: Record<PickupPosition, string> = {
  neck: 'manico',
  middle: 'centrale',
  bridge: 'ponte',
};

const AMP_INPUT_LABELS: Record<AmpInputPosition, string> = {
  'before-preamp': 'prima del preamplificatore',
  'after-preamp': 'dopo il preamplificatore',
  'active-cab': 'cassa attiva',
  'passive-cab': 'cassa passiva',
  'frfr-cab': 'cassa FRFR',
};

const normalizeModel = (model: string) => model.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Scelta esplicita se presente, altrimenti la voce dell'utente che corrisponde alla ES-335. */
export function resolveGuitar(guitars: Guitar[], selectedId?: string): Guitar | undefined {
  return guitars.find(guitar => guitar.id === selectedId)
    ?? guitars.find(guitar => normalizeModel(guitar.model).includes(DEFAULT_GUITAR_KEY));
}

/** Scelta esplicita se presente, altrimenti la voce dell'utente che corrisponde alla FRFR-112. */
export function resolveAmplifier(amplifiers: Amplifier[], selectedId?: string): Amplifier | undefined {
  return amplifiers.find(amplifier => amplifier.id === selectedId)
    ?? amplifiers.find(amplifier => normalizeModel(amplifier.model).includes(DEFAULT_AMPLIFIER_KEY));
}

export function describeGuitar(guitar?: Guitar): string {
  if (!guitar) return DEFAULT_GUITAR_DESCRIPTION;
  const pickups = guitar.pickups
    .map(pickup => `${PICKUP_POSITION_LABELS[pickup.position] ?? 'ponte'} ${pickup.type}${pickup.model ? ` (${pickup.model})` : ''}`)
    .join(', ');
  return `Chitarra: ${guitar.model}; pickup: ${pickups}`;
}

export function describeAmplifier(amplifier?: Amplifier): string {
  if (!amplifier) return DEFAULT_AMPLIFIER_DESCRIPTION;
  return `Amplificatore: ${amplifier.model}; collegamento: ${AMP_INPUT_LABELS[amplifier.inputPosition] ?? 'cassa FRFR'}`;
}

export function buildInstrumentationContext(guitar?: Guitar, amplifier?: Amplifier): string {
  return [describeGuitar(guitar), describeAmplifier(amplifier)].join('\n');
}
