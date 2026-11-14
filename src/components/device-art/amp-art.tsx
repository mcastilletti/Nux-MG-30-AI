import * as React from 'react';

/**
 * Ampli: un disegno per ognuno dei 30 modelli, che ne richiama l'aspetto (testata sopra la cassa o
 * combo, colore del rivestimento, tela della griglia, pannello comandi). Disegni originali, piatti,
 * senza marchi, scritte né foto. Griglia 54×70 come le altre sagome.
 */
type Form = 'stack' | 'combo-s' | 'combo-m' | 'combo-l' | 'fridge' | 'bass-stack' | 'rack' | 'mini' | 'preamp';
type Weave = 'plain' | 'silver' | 'diamond' | 'tweed' | 'wicker';

export interface AmpSpec {
  form: Form;
  /** Rivestimento (tolex). */
  tolex: string;
  /** Tela della griglia e suo disegno. */
  grille: string;
  weave: Weave;
  /** Pannello comandi. */
  panel: string;
  /** Manopole sul pannello (colore, quante). */
  knob: string;
  knobs: number;
  /** Due coni a vista (JC) o altri dettagli. */
  twoCones?: boolean;
}

const BLACK = '#25221f';
const CREAM = '#efe7d3';
const CHROME = '#c4c8cb';
const GOLD = '#d2b068';
const SILVER = '#bdb9b0';
const DEEP = '#15130f';

const A = (form: Form, tolex: string, grille: string, weave: Weave, panel: string, knob: string, knobs: number, extra: Partial<AmpSpec> = {}): AmpSpec => ({ form, tolex, grille, weave, panel, knob, knobs, ...extra });

export const AMP_ART: Record<string, AmpSpec> = {
  jazzclean: A('combo-l', '#2b2c2e', '#5b5f63', 'silver', CHROME, DEEP, 6, { twoCones: true }),
  deluxervb: A('combo-s', BLACK, SILVER, 'silver', CHROME, DEEP, 6),
  twinrvb: A('combo-l', BLACK, SILVER, 'silver', CHROME, DEEP, 6),
  superrvb: A('combo-m', BLACK, SILVER, 'silver', CHROME, DEEP, 6),
  bassmate: A('combo-m', '#c9a24a', '#6a5236', 'tweed', '#3b3024', CREAM, 4),
  tweedy: A('combo-s', '#b88a4c', '#5a3d2b', 'tweed', '#3b3024', CREAM, 3),
  classa15: A('combo-s', BLACK, '#4a2424', 'diamond', BLACK, GOLD, 5),
  classa30: A('combo-m', BLACK, '#4a2424', 'diamond', BLACK, GOLD, 6),
  calicrunch: A('combo-s', '#d9c8a1', '#7a6244', 'wicker', '#3b3024', CREAM, 5),
  britblues: A('combo-m', BLACK, '#5a5b5d', 'plain', '#3a3836', GOLD, 5),
  match: A('combo-m', BLACK, '#1a1816', 'plain', '#2f2c29', CHROME, 5),
  mrz38: A('combo-m', '#b3362b', '#cdb98e', 'wicker', '#2f2c29', CREAM, 5),
  vibroking: A('combo-l', '#d9cdb3', '#4d2c28', 'diamond', '#3b3024', CREAM, 5),
  budda: A('combo-s', BLACK, '#2a2623', 'plain', '#8e3d8f', CREAM, 5),
  hiwire: A('stack', BLACK, '#a6a6a2', 'silver', CHROME, DEEP, 6),
  plexi100w: A('stack', BLACK, '#7d8479', 'silver', GOLD, DEEP, 8),
  plexi45: A('stack', BLACK, '#2d2a27', 'plain', GOLD, DEEP, 6),
  brit800: A('stack', BLACK, '#2d2a27', 'plain', '#e8dcc0', DEEP, 6),
  '1987x50w': A('stack', BLACK, '#2d2a27', 'plain', '#d6bf86', DEEP, 5),
  slo100: A('stack', BLACK, '#2d2a27', 'plain', '#d8d9db', DEEP, 7),
  firemanhbe: A('stack', BLACK, '#2d2a27', 'plain', '#a8782f', CREAM, 6),
  brit2000: A('stack', BLACK, '#2d2a27', 'plain', GOLD, DEEP, 6),
  dievh4: A('stack', BLACK, '#2d2a27', 'plain', '#2a2623', CHROME, 8),
  uber: A('stack', BLACK, '#2d2a27', 'plain', '#d9d6cf', DEEP, 7),
  dualrect: A('stack', BLACK, '#2d2a27', 'plain', CHROME, DEEP, 8),
  agl: A('fridge', BLACK, '#b9b9b6', 'silver', CHROME, DEEP, 4),
  bassguy: A('bass-stack', BLACK, '#b5b2aa', 'silver', CHROME, DEEP, 5),
  mld: A('rack', BLACK, '#2a2623', 'plain', '#2a2623', '#7fd09a', 5, { twoCones: true }),
  stageman: A('mini', '#2a2623', '#15130f', 'plain', '#2a2623', CREAM, 4),
  optimair: A('preamp', '#2a2623', '#2a2623', 'plain', '#2a2623', CREAM, 6),
};

/** Ampli sconosciuto (modello nuovo): combo nero neutro. */
const FALLBACK: AmpSpec = A('combo-m', BLACK, SILVER, 'silver', CHROME, DEEP, 5);

function WeaveLines({ x, y, w, h, spec }: { x: number; y: number; w: number; h: number; spec: AmpSpec }) {
  const clipId = `amp-clip-${React.useId().replace(/:/g, '')}`;
  const lines: React.ReactNode[] = [];
  const dark = 'rgba(0,0,0,0.28)';
  const light = 'rgba(255,255,255,0.22)';
  if (spec.weave === 'silver') {
    for (let yy = y + 2; yy < y + h; yy += 2.6) lines.push(<line key={`h${yy}`} x1={x} x2={x + w} y1={yy} y2={yy} stroke={dark} strokeWidth="0.7" />);
    for (let xx = x + 2; xx < x + w; xx += 2.6) lines.push(<line key={`v${xx}`} x1={xx} x2={xx} y1={y} y2={y + h} stroke={light} strokeWidth="0.6" />);
  } else if (spec.weave === 'diamond') {
    for (let k = -h; k < w; k += 5) {
      lines.push(<line key={`a${k}`} x1={x + k} y1={y} x2={x + k + h} y2={y + h} stroke={light} strokeWidth="0.6" />);
      lines.push(<line key={`b${k}`} x1={x + k + h} y1={y} x2={x + k} y2={y + h} stroke={light} strokeWidth="0.6" />);
    }
  } else if (spec.weave === 'tweed') {
    for (let yy = y + 3; yy < y + h; yy += 3.4) lines.push(<line key={yy} x1={x} x2={x + w} y1={yy} y2={yy} stroke={light} strokeWidth="0.8" />);
  } else if (spec.weave === 'wicker') {
    for (let yy = y + 2; yy < y + h; yy += 2.2) lines.push(<line key={yy} x1={x} x2={x + w} y1={yy} y2={yy} stroke={dark} strokeWidth="0.6" />);
  } else {
    for (let yy = y + 3; yy < y + h; yy += 4) lines.push(<line key={yy} x1={x} x2={x + w} y1={yy} y2={yy} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />);
  }
  return (
    <>
      <clipPath id={clipId}><rect x={x} y={y} width={w} height={h} rx="1.5" /></clipPath>
      <g clipPath={`url(#${clipId})`}>{lines}</g>
    </>
  );
}

const Knobs = ({ n, x, w, cy, r, fill }: { n: number; x: number; w: number; cy: number; r: number; fill: string }) => (
  <>
    {Array.from({ length: n }, (_, i) => <circle key={i} cx={x + (w * (i + 0.5)) / n} cy={cy} r={r} fill={fill} />)}
  </>
);

/** Testata sopra la cassa 4×12. */
function Stack({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="20" y="1.5" width="14" height="3" rx="1.5" fill={DEEP} />
      <rect x="6" y="4" width="42" height="17" rx="2.5" fill={spec.tolex} />
      <rect x="8.5" y="6.8" width="37" height="9" rx="1" fill={spec.panel} />
      <Knobs n={spec.knobs} x={10} w={30} cy={11.3} r={1.5} fill={spec.knob} />
      <circle cx="43.2" cy="11.3" r="1.5" fill={led} />
      <rect x="8.5" y="17.4" width="37" height="1.6" rx="0.8" fill={color} />
      <rect x="4" y="22" width="46" height="45" rx="2.5" fill={spec.tolex} />
      <rect x="7" y="25" width="40" height="39" rx="1.5" fill={spec.grille} />
      <WeaveLines x={7} y={25} w={40} h={39} spec={spec} />
      <rect x="22" y="43" width="10" height="3" rx="0.8" fill={spec.panel} opacity="0.85" />
    </>
  );
}

function Combo({ spec, color, led, size }: { spec: AmpSpec; color: string; led: string; size: 's' | 'm' | 'l' }) {
  const [x, w, h] = size === 's' ? [7, 40, 40] : size === 'm' ? [4, 46, 44] : [2, 50, 44];
  const y = 66 - h;
  const gy = y + 12;
  const gh = h - 15;
  return (
    <>
      <rect x="20" y={y - 3} width="14" height="3.5" rx="1.7" fill={DEEP} />
      <rect x={x} y={y} width={w} height={h} rx="3" fill={spec.tolex} />
      <rect x={x + 3} y={y + 3} width={w - 6} height="7" rx="1" fill={spec.panel} />
      <Knobs n={spec.knobs} x={x + 5} w={w - 18} cy={y + 6.5} r={1.4} fill={spec.knob} />
      <circle cx={x + w - 7} cy={y + 6.5} r="1.4" fill={led} />
      <rect x={x + 3} y={gy} width={w - 6} height={gh} rx="1.5" fill={spec.grille} />
      <WeaveLines x={x + 3} y={gy} w={w - 6} h={gh} spec={spec} />
      {spec.twoCones && (
        <>
          <circle cx={x + w * 0.3} cy={gy + gh / 2} r={gh * 0.36} fill={DEEP} opacity="0.55" />
          <circle cx={x + w * 0.7} cy={gy + gh / 2} r={gh * 0.36} fill={DEEP} opacity="0.55" />
        </>
      )}
      <rect x={x + 3} y={y + h - 2.2} width={w - 6} height="1.5" rx="0.7" fill={color} />
    </>
  );
}

function Fridge({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="11" y="2" width="32" height="65" rx="3" fill={spec.tolex} />
      <rect x="13.5" y="5" width="27" height="7" rx="1" fill={spec.panel} />
      <Knobs n={spec.knobs} x={15} w={18} cy={8.5} r={1.5} fill={spec.knob} />
      <circle cx="37.5" cy="8.5" r="1.4" fill={led} />
      <rect x="13.5" y="15" width="27" height="49" rx="1.5" fill={spec.grille} />
      <WeaveLines x={13.5} y={15} w={27} h={49} spec={spec} />
      <rect x="13.5" y="13" width="27" height="1.4" fill={color} />
    </>
  );
}

function BassStack({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="20" y="3" width="14" height="3" rx="1.5" fill={DEEP} />
      <rect x="8" y="6" width="38" height="15" rx="2.5" fill={spec.tolex} />
      <rect x="10.5" y="9" width="33" height="7" rx="1" fill={spec.panel} />
      <Knobs n={spec.knobs} x={12} w={24} cy={12.5} r={1.4} fill={spec.knob} />
      <circle cx="40" cy="12.5" r="1.4" fill={led} />
      <rect x="10.5" y="17.6" width="33" height="1.6" rx="0.8" fill={color} />
      <rect x="5" y="22" width="44" height="45" rx="2.5" fill={spec.tolex} />
      <rect x="8" y="25" width="38" height="39" rx="1.5" fill={spec.grille} />
      <WeaveLines x={8} y={25} w={38} h={39} spec={spec} />
    </>
  );
}

function Rack({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="6" y="4" width="42" height="15" rx="2" fill={spec.tolex} />
      <rect x="9" y="6.5" width="20" height="7" rx="1" fill="#2f6fd0" />
      <rect x="10.5" y="8" width="17" height="1.4" fill="#9fc2f5" opacity="0.8" />
      <Knobs n={spec.knobs} x={31} w={15} cy={10} r={1.3} fill={spec.knob} />
      <circle cx="43" cy="15.5" r="1.3" fill={led} />
      <rect x="9" y="15.8" width="30" height="1.3" rx="0.6" fill={color} />
      <rect x="4" y="20" width="46" height="47" rx="2.5" fill={spec.tolex} />
      <circle cx="27" cy="33" r="9" fill={DEEP} stroke="#3a3632" strokeWidth="1.2" />
      <circle cx="27" cy="33" r="3" fill="#3a3632" />
      <circle cx="27" cy="54" r="9" fill={DEEP} stroke="#3a3632" strokeWidth="1.2" />
      <circle cx="27" cy="54" r="3" fill="#3a3632" />
    </>
  );
}

function Mini({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="20" y="17" width="14" height="3.5" rx="1.7" fill={DEEP} />
      <rect x="8" y="20" width="38" height="40" rx="3" fill="#8a5a3a" />
      <rect x="10" y="22" width="34" height="36" rx="2" fill={spec.tolex} />
      <rect x="12" y="24" width="30" height="5" rx="1" fill="#3a3632" />
      <Knobs n={spec.knobs} x={13} w={20} cy={26.5} r={1.2} fill={spec.knob} />
      <circle cx="38" cy="26.5" r="1.2" fill={led} />
      <rect x="12" y="31" width="30" height="24" rx="1.5" fill={spec.grille} />
      <WeaveLines x={12} y={31} w={30} h={24} spec={spec} />
      <rect x="12" y="55.4" width="30" height="1.2" fill={color} />
    </>
  );
}

function Preamp({ spec, color, led }: { spec: AmpSpec; color: string; led: string }) {
  return (
    <>
      <rect x="3" y="25" width="48" height="20" rx="3" fill={spec.tolex} />
      <rect x="3" y="25" width="48" height="2.4" rx="1.2" fill={GOLD} opacity="0.85" />
      <Knobs n={spec.knobs} x={6} w={34} cy={35} r={2.2} fill={spec.knob} />
      <circle cx="45.5" cy="35" r="1.6" fill={led} />
      <rect x="6" y="41" width="42" height="1.4" rx="0.7" fill={color} />
    </>
  );
}

export function AmpArt({ model, color, led }: { model?: string; color: string; led: string }) {
  const spec = (model && AMP_ART[model]) || FALLBACK;
  switch (spec.form) {
    case 'stack': return <Stack spec={spec} color={color} led={led} />;
    case 'combo-s': return <Combo spec={spec} color={color} led={led} size="s" />;
    case 'combo-m': return <Combo spec={spec} color={color} led={led} size="m" />;
    case 'combo-l': return <Combo spec={spec} color={color} led={led} size="l" />;
    case 'fridge': return <Fridge spec={spec} color={color} led={led} />;
    case 'bass-stack': return <BassStack spec={spec} color={color} led={led} />;
    case 'rack': return <Rack spec={spec} color={color} led={led} />;
    case 'mini': return <Mini spec={spec} color={color} led={led} />;
    case 'preamp': return <Preamp spec={spec} color={color} led={led} />;
  }
}
