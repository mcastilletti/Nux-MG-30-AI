import * as React from 'react';

/**
 * Pedali: ogni modello ha corpo, fascia e manopole nei colori del pedale che imita. Disegni originali,
 * piatti, senza marchi né scritte. Griglia 54×70. Il colore di categoria resta in una linguetta sul fondo.
 */
interface PedalSpec {
  body: string;
  /** Fascia con il nome (si disegna come due righe chiare/scure, mai testo). */
  trim: string;
  knob?: string;
  knobs?: number;
  /** Corpo largo (chorus grandi) o stretto (pedali compatti). */
  width?: 'wide' | 'slim';
  /** Schermo scuro al posto della fascia (compressore a display, delay digitali). */
  screen?: boolean;
}

const WHITE = '#e8e6e0';
const BLACK = '#222120';
const CREAM = '#f1e9d8';
const STEEL = '#d9d2c4';
const DEEP = '#1c1916';

const P = (body: string, trim: string, knobs: number, extra: Partial<PedalSpec> = {}): PedalSpec => ({ body, trim, knobs, ...extra });

export const PEDAL_ART: Record<string, PedalSpec> = {
  // compressori
  rose: P('#d9d9d6', '#b8334a', 2, { knob: BLACK }),
  kcomp: P('#9aa0a3', '#222120', 3, { knob: BLACK }),
  studiocomp: P('#bdbdbb', '#222120', 4, { knob: BLACK, screen: true }),
  // drive
  distplus: P('#e8c32a', '#222120', 2, { knob: BLACK }),
  rcboost: P('#dcdcdc', '#222120', 4, { knob: BLACK }),
  acboost: P('#c9a227', '#222120', 4, { knob: BLACK }),
  distone: P('#e26a1b', '#222120', 3, { knob: BLACK, width: 'slim' }),
  tscream: P('#4fa83d', '#e8e6e0', 3, { knob: WHITE }),
  bluesdrv: P('#3f6fb5', '#e8e6e0', 3, { knob: WHITE, width: 'slim' }),
  morningdrv: P('#c9b25a', '#3a2f22', 3, { knob: '#3a2f22' }),
  eatdist: P(BLACK, '#e8e6e0', 3, { knob: WHITE }),
  reddirt: P('#c4322b', '#e8e6e0', 3, { knob: WHITE }),
  crunch: P('#d0382a', '#222120', 3, { knob: BLACK }),
  mufffuzz: P(WHITE, '#c4322b', 3, { knob: BLACK }),
  katana: P(WHITE, '#222120', 2, { knob: BLACK, width: 'slim' }),
  // modulazione
  'mod-ce1': P('#a6c4d4', '#222120', 3, { knob: BLACK }),
  'mod-ce2': P('#59b6c9', '#e8e6e0', 2, { knob: BLACK, width: 'slim' }),
  'mod-stereo': P('#e3c735', '#222120', 3, { knob: BLACK, width: 'wide' }),
  'mod-vibrator': P('#3f86c9', '#e8e6e0', 2, { knob: BLACK, width: 'slim' }),
  'mod-detune': P('#5ab7a8', '#222120', 4, { knob: BLACK }),
  'mod-flanger': P('#6b4fa0', '#e8e6e0', 4, { knob: WHITE }),
  'mod-ph90': P('#e8822a', '#222120', 1, { knob: BLACK }),
  'mod-ph100': P('#d9761f', '#222120', 4, { knob: BLACK }),
  'mod-scf': P('#8b5bb5', '#e8e6e0', 4, { knob: WHITE }),
  'mod-uvibe': P('#cfcfcf', '#2a2623', 3, { knob: BLACK }),
  'mod-tremolo': P('#4aa3a3', '#222120', 2, { knob: BLACK, width: 'slim' }),
  'mod-rty': P('#6b3a22', '#d2b068', 2, { knob: CREAM }),
  'mod-harmony': P('#4b3f9e', '#e8e6e0', 4, { knob: WHITE }),
  // delay
  'dly-analog': P('#2c2c2c', '#7fd09a', 3, { knob: WHITE }),
  'dly-digital': P('#d96b9c', '#222120', 3, { knob: BLACK, width: 'slim' }),
  'dly-mod': P('#2f8f9d', '#e8e6e0', 4, { knob: WHITE }),
  'dly-tape': P('#8c5a2b', '#d2b068', 3, { knob: CREAM }),
  'dly-reverse': P('#4b3f9e', '#e8e6e0', 3, { knob: WHITE }),
  'dly-pan': P('#2b6a3f', '#e8e6e0', 3, { knob: WHITE }),
  'dly-duo': P('#3a5db5', '#e8e6e0', 4, { knob: WHITE, screen: true }),
  // reverb
  room: P('#d8d8d8', '#3a6fd0', 3, { knob: BLACK }),
  hall: P('#c8c8cc', '#3a6fd0', 4, { knob: BLACK }),
  plate: P('#e6e6ea', '#222120', 3, { knob: BLACK }),
  spring: P('#c9a26a', '#3a2f22', 3, { knob: '#3a2f22' }),
  shimmer: P('#5a3fb0', '#e8e6e0', 4, { knob: WHITE }),
  // noise gate
  gate: P('#4f9a62', '#e8e6e0', 2, { knob: WHITE, width: 'slim' }),
};

const KNOB_X: Record<number, number[]> = { 1: [27], 2: [18, 36], 3: [14, 27, 40], 4: [11, 21.5, 32.5, 43] };

export function PedalArt({ model, color, led, knobs }: { model?: string; color: string; led: string; knobs?: number }) {
  const spec = model ? PEDAL_ART[model] : undefined;
  const body = spec?.body ?? color;
  const trim = spec?.trim ?? CREAM;
  const knobColor = spec?.knob ?? CREAM;
  const n = Math.min(4, Math.max(1, spec?.knobs ?? knobs ?? 3));
  const [x, w] = spec?.width === 'wide' ? [1.5, 51] : spec?.width === 'slim' ? [8, 38] : [3, 48];
  const cx = x + w / 2;
  const r = n >= 4 ? 3.6 : n === 3 ? 4.2 : 4.8;
  const xs = KNOB_X[n].map((kx) => cx + ((kx - 27) * w) / 48);
  return (
    <>
      <rect x={x} y="3" width={w} height="64" rx="7" fill={body} />
      <rect x={x} y="3" width={w} height="64" rx="7" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      {xs.map((kx) => (
        <g key={kx}>
          <circle cx={kx} cy="15" r={r} fill={knobColor} />
          <line x1={kx} y1="15" x2={kx} y2={15 - r + 0.8} stroke={knobColor === BLACK || knobColor === DEEP ? WHITE : DEEP} strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
      {spec?.screen ? (
        <rect x={x + 5} y="24.5" width={w - 10} height="9" rx="1.5" fill={DEEP} />
      ) : (
        <>
          <rect x={x + 5} y="24.5" width={w - 10} height="9" rx="1.5" fill={trim} opacity="0.92" />
          <rect x={x + 8} y="27" width={(w - 16) * 0.7} height="1.6" rx="0.8" fill="rgba(255,255,255,0.55)" />
          <rect x={x + 8} y="30" width={(w - 16) * 0.45} height="1.2" rx="0.6" fill="rgba(0,0,0,0.4)" />
        </>
      )}
      <circle cx={cx} cy="40" r="2.2" fill={led} />
      <circle cx={cx} cy="53" r="8" fill={STEEL} stroke="#00000044" strokeWidth="2" />
      <rect x={cx - 10} y="63.4" width="20" height="1.8" rx="0.9" fill={color} />
    </>
  );
}

const WAH_ART: Record<string, { body: string; trim: string; head: string }> = {
  clyde: { body: '#c9c9c5', trim: '#222120', head: '#8e8e8a' },
  crybbn: { body: '#2a2623', trim: '#d2b068', head: '#111' },
  v847: { body: '#b0b3b6', trim: '#222120', head: '#2a2623' },
  horsewah: { body: '#6b4b2a', trim: '#f1e9d8', head: '#2a1d10' },
};

export function WahArt({ model, color, led }: { model?: string; color: string; led: string }) {
  const s = (model && WAH_ART[model]) || { body: color, trim: STEEL, head: BLACK };
  return (
    <>
      <path d="M4 52H50V36L4 44Z" fill={s.body} />
      <path d="M3 41L51 29" stroke={s.head} strokeWidth="7" strokeLinecap="round" />
      <path d="M12 39l2-4M20 37l2-4M28 35l2-4M36 33l2-4" stroke={s.trim} strokeWidth="1.5" opacity="0.7" />
      <circle cx="27" cy="36" r="2.6" fill={s.trim} />
      <rect x="3" y="52" width="48" height="4" rx="2" fill={DEEP} />
      <circle cx="44" cy="45" r="2.6" fill={led} />
      <rect x="14" y="58" width="26" height="1.8" rx="0.9" fill={color} />
    </>
  );
}

const EQ_ART: Record<string, { body: string; sliders: number; knobs?: boolean }> = {
  'eq-ge6': { body: '#8f9296', sliders: 6 },
  'eq-align': { body: '#2f3a4a', sliders: 5 },
  'eq-10band': { body: '#3a3836', sliders: 10 },
  'eq-para': { body: '#a87d3c', sliders: 4, knobs: true },
};

export function EqArt({ model, color, led }: { model?: string; color: string; led: string }) {
  const s = (model && EQ_ART[model]) || { body: color, sliders: 5 };
  const xs = Array.from({ length: s.sliders }, (_, i) => 8 + ((38 * (i + 0.5)) / s.sliders));
  return (
    <>
      <rect x="3" y="3" width="48" height="64" rx="8" fill={s.body} />
      {s.knobs ? (
        xs.map((x) => <circle key={x} cx={x} cy="17" r="3.4" fill={CREAM} />)
      ) : (
        xs.map((x, i) => (
          <g key={x}>
            <line x1={x} y1="9" x2={x} y2="29" stroke={DEEP} strokeWidth={s.sliders > 8 ? 1.4 : 2} />
            <rect x={x - (s.sliders > 8 ? 1.7 : 3)} y={12 + ((i * 7) % 13)} width={s.sliders > 8 ? 3.4 : 6} height="3" rx="1" fill={CREAM} />
          </g>
        ))
      )}
      <circle cx="27" cy="37" r="2.6" fill={led} />
      <circle cx="27" cy="54" r="7" fill={STEEL} stroke="#00000044" strokeWidth="2" />
      <rect x="14" y="63.4" width="26" height="1.8" rx="0.9" fill={color} />
    </>
  );
}
