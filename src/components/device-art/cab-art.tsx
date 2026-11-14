import * as React from 'react';
import { AmpArt } from './amp-art';

/**
 * Casse (IR): le casse nate come combo mostrano il fronte del combo; le casse da stack e per basso hanno
 * la griglia, il rivestimento e la targhetta dell'originale. Disegni originali, senza marchi né scritte.
 */
type Layout = '4x12' | '2x12' | '4x10' | '8x10';
interface CabSpec {
  layout: Layout;
  tolex: string;
  grille: string;
  plate: string;
  weave: 'plain' | 'silver';
}

const BLACK = '#25221f';
const DEEP = '#15130f';

/** IR nati come combo → ampli di cui si disegna il fronte. */
const COMBO_FRONT: Record<string, string> = {
  'ir-a212': 'classa30',
  'ir-jz120': 'jazzclean',
  'ir-tr212': 'twinrvb',
  'ir-dr112': 'deluxervb',
  'ir-bs410': 'bassmate',
};

const BOX: Record<Layout, [number, number, number, number]> = {
  '4x12': [5, 9, 44, 50],
  '2x12': [3, 18, 48, 32],
  '4x10': [7, 11, 40, 46],
  '8x10': [10, 2, 34, 62],
};
const CONES: Record<Layout, Array<[number, number, number]>> = {
  '4x12': [[18, 24, 8], [36, 24, 8], [18, 44, 8], [36, 44, 8]],
  '2x12': [[17, 34, 9], [37, 34, 9]],
  '4x10': [[19, 25, 6.5], [35, 25, 6.5], [19, 43, 6.5], [35, 43, 6.5]],
  '8x10': [[20, 12, 5], [34, 12, 5], [20, 26, 5], [34, 26, 5], [20, 40, 5], [34, 40, 5], [20, 54, 5], [34, 54, 5]],
};

const CAB_ART: Record<string, CabSpec> = {
  'ir-gb412': { layout: '4x12', tolex: BLACK, grille: '#8d8f8a', plate: '#d0cfc8', weave: 'silver' },
  'ir-v412': { layout: '4x12', tolex: BLACK, grille: '#2d2a27', plate: '#bfb8a8', weave: 'plain' },
  'ir-1960': { layout: '4x12', tolex: BLACK, grille: '#2a2724', plate: '#d9d2c0', weave: 'plain' },
  'ir-sv212': { layout: '2x12', tolex: BLACK, grille: '#b9b9b6', plate: '#d9d6cf', weave: 'silver' },
  'ir-sv410': { layout: '4x10', tolex: BLACK, grille: '#b9b9b6', plate: '#d9d6cf', weave: 'silver' },
  'ir-mkb410': { layout: '4x10', tolex: '#2f2c29', grille: '#1a1816', plate: '#c4c8cb', weave: 'plain' },
  'ir-trc410': { layout: '4x10', tolex: BLACK, grille: '#8c8f93', plate: '#d9d6cf', weave: 'silver' },
  'ir-eden410': { layout: '4x10', tolex: '#1f1c19', grille: '#2d2a27', plate: '#d2b068', weave: 'plain' },
  'ir-bassguy410': { layout: '4x10', tolex: BLACK, grille: '#b5b2aa', plate: '#c4c8cb', weave: 'silver' },
  'ir-sv810': { layout: '8x10', tolex: BLACK, grille: '#2d2a27', plate: '#c4c8cb', weave: 'plain' },
  'ir-agldb810': { layout: '8x10', tolex: BLACK, grille: '#b9b9b6', plate: '#c4c8cb', weave: 'silver' },
};

export const hasCabArt = (model: string) => model in CAB_ART || model in COMBO_FRONT;

export function CabArt({ model, color, led }: { model?: string; color: string; led: string }) {
  if (model && COMBO_FRONT[model]) return <AmpArt model={COMBO_FRONT[model]} color={color} led={led} />;
  const spec = (model && CAB_ART[model]) || CAB_ART['ir-v412'];
  const [x, y, w, h] = BOX[spec.layout];
  const lines: React.ReactNode[] = [];
  if (spec.weave === 'silver') {
    for (let yy = y + 5; yy < y + h - 3; yy += 2.6) lines.push(<line key={`h${yy}`} x1={x + 3} x2={x + w - 3} y1={yy} y2={yy} stroke="rgba(0,0,0,0.26)" strokeWidth="0.7" />);
  } else {
    for (let yy = y + 6; yy < y + h - 3; yy += 4) lines.push(<line key={`p${yy}`} x1={x + 3} x2={x + w - 3} y1={yy} y2={yy} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />);
  }
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={spec.tolex} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="1.5" fill={spec.grille} />
      {lines}
      {CONES[spec.layout].map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="none" stroke={DEEP} strokeOpacity="0.22" strokeWidth="1" />)}
      <rect x={x + w / 2 - 6} y={y + h / 2 - 1.6} width="12" height="3.2" rx="0.8" fill={spec.plate} opacity="0.9" />
      <circle cx={x + w - 6} cy={y + h - 1.2} r="0.01" fill={led} />
      <rect x={x + 5} y={y + h - 1.6} width={w - 10} height="1.4" rx="0.7" fill={color} />
    </>
  );
}
