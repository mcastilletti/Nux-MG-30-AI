import * as React from 'react';
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
}

const CREAM = '#f1e9d8';
const STEEL = '#d9d2c4';
const BLACK = '#2b2622';
const DEEP = '#1c1916';
const TWEED = '#3a332c';
const GRILLE = '#4a4239';

const KNOB_X: Record<number, number[]> = { 1: [27], 2: [16, 38], 3: [13, 27, 41], 4: [11, 21.5, 32.5, 43] };

const Stomp = ({ color, led, knobs = 3 }: ShapeProps) => {
  const n = Math.min(4, Math.max(1, knobs));
  const r = n >= 4 ? 4 : n === 3 ? 4.6 : 5.4;
  return (
    <>
      <rect x="3" y="3" width="48" height="64" rx="8" fill={color} />
      {KNOB_X[n].map((x) => <circle key={x} cx={x} cy="16" r={r} fill={CREAM} />)}
      <circle cx="27" cy="31" r="2.6" fill={led} />
      <circle cx="27" cy="52" r="8" fill={STEEL} stroke="#00000044" strokeWidth="2" />
    </>
  );
};

const Eq = ({ color, led }: ShapeProps) => (
  <>
    <rect x="3" y="3" width="48" height="64" rx="8" fill={color} />
    <path d="M11 9v20M19 9v20M27 9v20M35 9v20M43 9v20" stroke={DEEP} strokeWidth="2" />
    <rect x="8" y="17" width="6" height="3" rx="1" fill={CREAM} />
    <rect x="16" y="13" width="6" height="3" rx="1" fill={CREAM} />
    <rect x="24" y="21" width="6" height="3" rx="1" fill={CREAM} />
    <rect x="32" y="15" width="6" height="3" rx="1" fill={CREAM} />
    <rect x="40" y="19" width="6" height="3" rx="1" fill={CREAM} />
    <circle cx="27" cy="37" r="2.6" fill={led} />
    <circle cx="27" cy="54" r="7" fill={STEEL} stroke="#00000044" strokeWidth="2" />
  </>
);

const Wah = ({ color, led }: ShapeProps) => (
  <>
    <path d="M4 52H50V36L4 44Z" fill={color} />
    <path d="M3 41L51 29" stroke={BLACK} strokeWidth="7" strokeLinecap="round" />
    <path d="M12 39l2-4M20 37l2-4M28 35l2-4M36 33l2-4" stroke="#6a5f55" strokeWidth="1.5" />
    <circle cx="27" cy="36" r="2.6" fill={STEEL} />
    <rect x="3" y="52" width="48" height="4" rx="2" fill={DEEP} />
    <circle cx="44" cy="45" r="2.6" fill={led} />
  </>
);

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

const Head = ({ color, led }: ShapeProps) => (
  <>
    <rect x="19" y="9" width="16" height="5" rx="2.5" fill={BLACK} />
    <rect x="3" y="14" width="48" height="42" rx="6" fill={BLACK} />
    <rect x="7" y="18" width="40" height="13" rx="2" fill={color} />
    {[13, 20, 27, 34].map((x) => <circle key={x} cx={x} cy="24.5" r="2.4" fill={DEEP} />)}
    <circle cx="42" cy="24.5" r="2.4" fill={led} />
    <rect x="7" y="35" width="40" height="17" rx="2" fill={TWEED} />
    <path d="M10 39h34M10 43.5h34M10 48h34" stroke={GRILLE} strokeWidth="1.6" />
  </>
);

const Combo = ({ color, led }: ShapeProps) => (
  <>
    <rect x="19" y="5" width="16" height="5" rx="2.5" fill={BLACK} />
    <rect x="3" y="10" width="48" height="56" rx="6" fill={BLACK} />
    <rect x="7" y="14" width="40" height="11" rx="2" fill={color} />
    {[13, 20, 27, 34].map((x) => <circle key={x} cx={x} cy="19.5" r="2.2" fill={DEEP} />)}
    <circle cx="42" cy="19.5" r="2.2" fill={led} />
    <rect x="7" y="29" width="40" height="33" rx="3" fill={TWEED} />
    <circle cx="27" cy="45.5" r="12" fill={DEEP} />
    <circle cx="27" cy="45.5" r="4" fill={color} />
  </>
);

/** Cassa con coni: `cones` = [[cx, cy, r]]. */
const Cabinet = ({ color, led, box, cones, ledY = 64 }: ShapeProps & { box: [number, number, number, number]; cones: Array<[number, number, number]>; ledY?: number }) => {
  const [x, y, w, h] = box;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="5" fill={BLACK} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="3" fill={color} opacity="0.35" />
      {cones.map(([cx, cy, r]) => (
        <React.Fragment key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill={DEEP} />
          <circle cx={cx} cy={cy} r={Math.max(1.8, r * 0.32)} fill={color} />
        </React.Fragment>
      ))}
      <circle cx="27" cy={ledY} r="2.6" fill={led} />
    </>
  );
};

const Cab4x12 = (p: ShapeProps) => <Cabinet {...p} box={[5, 9, 44, 50]} cones={[[18, 24, 8], [36, 24, 8], [18, 44, 8], [36, 44, 8]]} />;
const Cab2x12 = (p: ShapeProps) => <Cabinet {...p} box={[3, 18, 48, 32]} cones={[[17, 34, 9], [37, 34, 9]]} ledY={57} />;
const Cab1x12 = (p: ShapeProps) => <Cabinet {...p} box={[8, 14, 38, 40]} cones={[[27, 34, 12]]} ledY={61} />;
const Cab4x10 = (p: ShapeProps) => <Cabinet {...p} box={[7, 11, 40, 46]} cones={[[19, 25, 6.5], [35, 25, 6.5], [19, 43, 6.5], [35, 43, 6.5]]} ledY={63} />;
const Cab8x10 = (p: ShapeProps) => (
  <Cabinet {...p} box={[10, 2, 34, 62]} cones={[[20, 12, 5], [34, 12, 5], [20, 26, 5], [34, 26, 5], [20, 40, 5], [34, 40, 5], [20, 54, 5], [34, 54, 5]]} ledY={68} />
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

const MicDynamic = ({ color, led }: ShapeProps) => (
  <>
    <rect x="19" y="6" width="16" height="18" rx="6" fill={STEEL} />
    <path d="M21 11h12M21 15h12M21 19h12" stroke="#8a8276" strokeWidth="1.4" />
    <path d="M20 24H34L31 60H23Z" fill={color} />
    <rect x="23" y="60" width="8" height="5" rx="1.5" fill={DEEP} />
    <circle cx="27" cy="38" r="2.6" fill={led} />
  </>
);

const MicCondenser = ({ color, led }: ShapeProps) => (
  <>
    <rect x="15" y="4" width="24" height="32" rx="12" fill={STEEL} />
    <path d="M17 13h20M16 19h22M16 25h22M18 31h18" stroke="#8a8276" strokeWidth="1.4" />
    <rect x="18" y="36" width="18" height="22" rx="3" fill={color} />
    <path d="M11 30v8a16 12 0 0 0 32 0v-8" stroke="#6a5f55" strokeWidth="2" fill="none" />
    <rect x="25" y="58" width="4" height="8" fill={BLACK} />
    <circle cx="27" cy="47" r="2.6" fill={led} />
  </>
);

const MicRibbon = ({ color, led }: ShapeProps) => (
  <>
    <path d="M9 22v22a5 5 0 0 0 5 5h26a5 5 0 0 0 5-5V22" stroke="#6a5f55" strokeWidth="2.5" fill="none" />
    <rect x="14" y="8" width="26" height="40" rx="9" fill={color} />
    <path d="M18 16h18M17 22h20M17 28h20M17 34h20M18 40h18" stroke={DEEP} strokeWidth="2" />
    <rect x="25" y="49" width="4" height="16" fill={BLACK} />
    <circle cx="27" cy="58" r="2.4" fill={led} />
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
  stomp: Stomp,
  eq: Eq,
  wah: Wah,
  expression: Expression,
  head: Head,
  combo: Combo,
  'cab-4x12': Cab4x12,
  'cab-2x12': Cab2x12,
  'cab-1x12': Cab1x12,
  'cab-4x10': Cab4x10,
  'cab-8x10': Cab8x10,
  acoustic: Acoustic,
  'user-ir': UserIr,
  'mic-dynamic': MicDynamic,
  'mic-condenser': MicCondenser,
  'mic-ribbon': MicRibbon,
  'send-return': SendReturn,
};

/** Nome leggibile per le tecnologie assistive. */
export const DEVICE_LABEL: Record<DeviceKind, string> = {
  stomp: 'Pedale',
  eq: 'Equalizzatore',
  wah: 'Pedale wah',
  expression: 'Pedale d’espressione',
  head: 'Testata',
  combo: 'Combo',
  'cab-4x12': 'Cassa 4×12',
  'cab-2x12': 'Cassa 2×12',
  'cab-1x12': 'Cassa 1×12',
  'cab-4x10': 'Cassa 4×10',
  'cab-8x10': 'Cassa 8×10',
  acoustic: 'Chitarra acustica',
  'user-ir': 'IR utente',
  'mic-dynamic': 'Microfono dinamico',
  'mic-condenser': 'Microfono a condensatore',
  'mic-ribbon': 'Microfono a nastro',
  'send-return': 'Send/Return',
};
