import * as React from 'react';
import { AmpArt } from './amp-art';
import { CabArt } from './cab-art';
import { EqArt, PedalArt, WahArt } from './pedal-art';
import { MicArt } from './mic-art';
import type { DeviceKind } from './types';

/**
 * Disegni dei dispositivi su una griglia 54×70. Il corpo prende il colore di categoria quando il blocco è
 * acceso e il colore "spento" altrimenti; il LED diventa verde. I toni fissi (crema, nero caldo) sono i
 * materiali: manopole, griglie, coni.
 */
export interface ShapeProps {
  color: string;
  led: string;
  knobs?: number;
  model?: string;
}

const CREAM = '#f1e9d8';
const STEEL = '#d9d2c4';
const BLACK = '#2b2622';
const DEEP = '#1c1916';
const TWEED = '#3a332c';
const GRILLE = '#4a4239';

const Expression = ({ color, led }: ShapeProps) => (
  <>
    <rect x="10" y="16" width="34" height="5" rx="2.5" fill={BLACK} />
    <rect x="10" y="16" width="26" height="5" rx="2.5" fill={CREAM} />
    <rect x="4" y="36" width="46" height="14" rx="4" fill={color} />
    <path d="M4 34L50 30" stroke={BLACK} strokeWidth="6" strokeLinecap="round" />
    <rect x="3" y="50" width="48" height="4" rx="2" fill={DEEP} />
    <circle cx="44" cy="43" r="2.6" fill={led} />
  </>
);

const Acoustic = ({ color, led }: ShapeProps) => (
  <>
    <rect x="24" y="2" width="6" height="22" rx="2" fill={BLACK} />
    <path d="M27 22C17 22 15 30 19 36C11 40 10 60 27 64C44 60 43 40 35 36C39 30 37 22 27 22Z" fill={color} />
    <circle cx="27" cy="44" r="5.5" fill={DEEP} />
    <rect x="21" y="55" width="12" height="3" rx="1.5" fill={DEEP} />
    <circle cx="44" cy="62" r="2.6" fill={led} />
  </>
);

const UserIr = ({ color, led }: ShapeProps) => (
  <>
    <rect x="5" y="9" width="44" height="50" rx="5" fill={BLACK} />
    <rect x="8" y="12" width="38" height="44" rx="3" fill={color} opacity="0.35" />
    <path d="M10 36h6l3-14 4 26 4-20 3 12 3-5h11" stroke={CREAM} strokeWidth="2.2" fill="none" strokeLinejoin="round" />
    <circle cx="27" cy="64" r="2.6" fill={led} />
  </>
);

const SendReturn = ({ color, led }: ShapeProps) => (
  <>
    <path d="M14 12h10M20 8l4 4-4 4M40 12H30M34 8l-4 4 4 4" stroke="#8a8276" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="7" y="20" width="40" height="32" rx="6" fill={color} />
    <circle cx="19" cy="34" r="6" fill={DEEP} />
    <circle cx="19" cy="34" r="2.4" fill="#8a8276" />
    <circle cx="35" cy="34" r="6" fill={DEEP} />
    <circle cx="35" cy="34" r="2.4" fill="#8a8276" />
    <circle cx="27" cy="47" r="2.6" fill={led} />
  </>
);

export const SHAPES: Record<DeviceKind, (props: ShapeProps) => React.ReactElement> = {
  stomp: ({ color, led, knobs, model }) => <PedalArt model={model} color={color} led={led} knobs={knobs} />,
  eq: ({ color, led, model }) => <EqArt model={model} color={color} led={led} />,
  wah: ({ color, led, model }) => <WahArt model={model} color={color} led={led} />,
  expression: Expression,
  amp: ({ color, led, model }) => <AmpArt model={model} color={color} led={led} />,
  cab: ({ color, led, model }) => <CabArt model={model} color={color} led={led} />,
  acoustic: Acoustic,
  'user-ir': UserIr,
  'mic-sm57': (p) => <MicArt kind="mic-sm57" color={p.color} led={p.led} />,
  'mic-md421': (p) => <MicArt kind="mic-md421" color={p.color} led={p.led} />,
  'mic-beta52': (p) => <MicArt kind="mic-beta52" color={p.color} led={p.led} />,
  'mic-u87': (p) => <MicArt kind="mic-u87" color={p.color} led={p.led} />,
  'mic-c414': (p) => <MicArt kind="mic-c414" color={p.color} led={p.led} />,
  'mic-c3000': (p) => <MicArt kind="mic-c3000" color={p.color} led={p.led} />,
  'mic-r121': (p) => <MicArt kind="mic-r121" color={p.color} led={p.led} />,
  'mic-r122': (p) => <MicArt kind="mic-r122" color={p.color} led={p.led} />,
  'send-return': SendReturn,
};

/** Nome leggibile per le tecnologie assistive. */
export const DEVICE_LABEL: Record<DeviceKind, string> = {
  stomp: 'Pedale',
  eq: 'Equalizzatore',
  wah: 'Pedale wah',
  expression: 'Pedale d’espressione',
  amp: 'Ampli',
  cab: 'Cassa',
  acoustic: 'Chitarra acustica',
  'user-ir': 'IR utente',
  'mic-sm57': 'Microfono dinamico (S57)',
  'mic-md421': 'Microfono dinamico (MD421)',
  'mic-beta52': 'Microfono per cassa (Beta 52)',
  'mic-u87': 'Microfono a condensatore (U87)',
  'mic-c414': 'Microfono a condensatore (C414)',
  'mic-c3000': 'Microfono a condensatore (C3000)',
  'mic-r121': 'Microfono a nastro (R121)',
  'mic-r122': 'Microfono a nastro (R122)',
  'send-return': 'Send/Return',
};
