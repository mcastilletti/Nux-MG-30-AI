import type { Amplifier, AmpInputPosition, Guitar, PickupPosition } from '@/types/instrumentation';

/**
 * Strumentazione per l'AI: solo quella inserita in Strumentazione, scelta dall'utente. Niente chitarra o
 * ampli "predefiniti": se non c'è nulla, l'AI lo sa e progetta un suono neutro.
 *
 * Per i modelli di cui l'app conosce le specifiche ufficiali (Epiphone ES-335 2022, Headrush FRFR-112 MK2)
 * il testo include anche quei dati; per gli altri strumenti l'AI riceve solo ciò che l'utente ha inserito.
 */
export const GUITAR_NOT_SET = 'Chitarra: non specificata (nessuna chitarra inserita in Strumentazione): non presumere pickup né modello';
export const AMPLIFIER_NOT_SET = 'Amplificatore: non specificato (nessun amplificatore inserito in Strumentazione): non presumere il tipo di collegamento né di riproduzione';

const KNOWN_GUITAR_SPECS: Array<{ key: string; text: string }> = [
  { key: 'es335', text: 'dati noti: semi-hollow, corpo in acero laminato con blocco centrale in acero, manico in mogano profilo Rounded "C", scala 24.72", 22 tasti medium jumbo; controlli 2 volume, 2 tone, selettore 3 vie; corde Ernie Ball .010-.046 (se i pickup elencati sopra sono diversi, valgono quelli elencati)' },
];

const KNOWN_AMP_SPECS: Array<{ key: string; text: string }> = [
  { key: 'frfr112', text: 'dati noti: cassa attiva full-range, woofer 12", driver HF con uscita da 1", crossover 2 kHz, risposta in frequenza 53 Hz-20 kHz ±3 dB, gamma 44 Hz-20 kHz -10 dB, copertura 90°x60°, interruttore HPF 100 Hz di stato non noto' },
];

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

/** Chitarra scelta; se la scelta manca o non esiste più, la prima inserita (nessuna se l'elenco è vuoto). */
export function resolveGuitar(guitars: Guitar[], selectedId?: string): Guitar | undefined {
  return guitars.find(guitar => guitar.id === selectedId) ?? guitars[0];
}

/** Amplificatore scelto; se la scelta manca o non esiste più, il primo inserito (nessuno se l'elenco è vuoto). */
export function resolveAmplifier(amplifiers: Amplifier[], selectedId?: string): Amplifier | undefined {
  return amplifiers.find(amplifier => amplifier.id === selectedId) ?? amplifiers[0];
}

const knownSpec = (specs: Array<{ key: string; text: string }>, model: string) => specs.find(spec => normalizeModel(model).includes(spec.key))?.text;

export function describeGuitar(guitar?: Guitar): string {
  if (!guitar) return GUITAR_NOT_SET;
  const pickups = guitar.pickups
    .map(pickup => `${PICKUP_POSITION_LABELS[pickup.position] ?? 'ponte'} ${pickup.type}${pickup.model ? ` (${pickup.model})` : ''}`)
    .join(', ');
  const spec = knownSpec(KNOWN_GUITAR_SPECS, guitar.model);
  return `Chitarra: ${guitar.model}; pickup: ${pickups || 'non indicati'}${spec ? `; ${spec}` : ''}`;
}

export function describeAmplifier(amplifier?: Amplifier): string {
  if (!amplifier) return AMPLIFIER_NOT_SET;
  const spec = knownSpec(KNOWN_AMP_SPECS, amplifier.model);
  return `Amplificatore: ${amplifier.model}; collegamento: ${AMP_INPUT_LABELS[amplifier.inputPosition] ?? 'non indicato'}${spec ? `; ${spec}` : ''}`;
}

export function buildInstrumentationContext(guitar?: Guitar, amplifier?: Amplifier): string {
  return [describeGuitar(guitar), describeAmplifier(amplifier)].join('\n');
}
