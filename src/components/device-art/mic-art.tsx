import * as React from 'react';

/**
 * Microfoni: uno per ognuna delle 8 voci "Mic" degli IR, con la forma riconoscibile dell'originale
 * (corto e rotondo, a nastro lungo, da cassa grande…). Disegni originali, senza marchi.
 */
interface MicSpec {
  /** Testa: x centrale, larghezza, y, altezza. */
  head: [number, number];
  headY: number;
  headFill: string;
  mesh: 'lines' | 'dots' | 'ribbon';
  /** Corpo: larghezza (alla base) e lunghezza. */
  body: [number, number];
  bodyFill: string;
  /** Sagoma della testa: rotonda, ovale o rettangolare. */
  shape: 'round' | 'oval' | 'rect';
}

const STEEL = '#d0cbbf';
const MESH = '#8a8276';
const DEEP = '#1c1916';

export const MIC_ART = {
  'mic-sm57': { head: [13, 16], headY: 6, headFill: '#b8b4aa', mesh: 'lines', body: [8, 38], bodyFill: '#2a2623', shape: 'round' },
  'mic-md421': { head: [20, 15], headY: 8, headFill: '#8f8d88', mesh: 'lines', body: [9, 34], bodyFill: '#1f1c19', shape: 'rect' },
  'mic-beta52': { head: [28, 24], headY: 8, headFill: '#3a3836', mesh: 'dots', body: [16, 22], bodyFill: '#2a2623', shape: 'round' },
  'mic-u87': { head: [20, 30], headY: 4, headFill: '#e5dcc5', mesh: 'dots', body: [12, 24], bodyFill: '#cfc6ae', shape: 'oval' },
  'mic-c414': { head: [22, 22], headY: 5, headFill: '#b9bcc0', mesh: 'dots', body: [14, 28], bodyFill: '#8e9296', shape: 'round' },
  'mic-c3000': { head: [24, 26], headY: 4, headFill: '#4a4744', mesh: 'dots', body: [16, 26], bodyFill: '#2a2623', shape: 'oval' },
  'mic-r121': { head: [14, 26], headY: 6, headFill: '#cfcabd', mesh: 'ribbon', body: [10, 22], bodyFill: '#b3ae9f', shape: 'rect' },
  'mic-r122': { head: [14, 34], headY: 5, headFill: '#cfcabd', mesh: 'ribbon', body: [10, 22], bodyFill: '#b3ae9f', shape: 'rect' },
} satisfies Record<string, MicSpec>;

export type MicKind = keyof typeof MIC_ART;
export const MIC_KINDS = Object.keys(MIC_ART) as MicKind[];

export function MicArt({ kind, color, led }: { kind: MicKind; color: string; led: string }) {
  const s: MicSpec = MIC_ART[kind];
  const [hw, hh] = s.head;
  const hx = 27 - hw / 2;
  const rx = s.shape === 'round' ? Math.min(hw, hh) / 2 : s.shape === 'oval' ? hw / 2 : 2.5;
  const by = s.headY + hh;
  const [bw, bl] = s.body;
  const lines: React.ReactNode[] = [];
  if (s.mesh === 'ribbon') {
    for (let yy = s.headY + 4; yy < by - 2; yy += 3) lines.push(<line key={yy} x1={hx + 2.5} x2={hx + hw - 2.5} y1={yy} y2={yy} stroke={DEEP} strokeWidth="1.3" />);
  } else if (s.mesh === 'lines') {
    for (let yy = s.headY + 4; yy < by - 2; yy += 3.4) lines.push(<line key={yy} x1={hx + 2} x2={hx + hw - 2} y1={yy} y2={yy} stroke={MESH} strokeWidth="1.1" />);
  } else {
    for (let yy = s.headY + 5; yy < by - 3; yy += 4) {
      for (let xx = hx + 4; xx < hx + hw - 2; xx += 4) lines.push(<circle key={`${xx}-${yy}`} cx={xx} cy={yy} r="0.8" fill={MESH} />);
    }
  }
  return (
    <>
      <rect x={hx} y={s.headY} width={hw} height={hh} rx={rx} fill={s.headFill} />
      {lines}
      <path d={`M${27 - hw / 2 + 1} ${by - 1}H${27 + hw / 2 - 1}L${27 + bw / 2} ${by + bl}H${27 - bw / 2}Z`} fill={s.bodyFill} />
      <rect x="25" y={by + 2} width="4" height="2" fill={color} />
      <circle cx="27" cy={by + bl * 0.5} r="1.7" fill={led} />
      <rect x="24" y={by + bl} width="6" height="5" rx="1.5" fill={STEEL} opacity="0.35" />
    </>
  );
}
