import type { DeviceArtSpec, DeviceKind } from '@/components/device-art/types';
import { MG30_MODELS } from '@/lib/mg30-data';
import type { EffectType } from '@/types/preset';

/**
 * Quale sagoma disegnare per un modello. Ogni ampli ha il suo disegno (`amp` + id del modello, vedi
 * `amp-art.tsx`), ispirato all'ampli originale; i preamplificatori NUX (MLD, Optima Air) sono ampli
 * compatti. Gli altri blocchi hanno la sagoma di ciò che sono.
 */
/** Casse: numero e misura dei coni dal modello. */
const CAB_KIND: Record<string, DeviceKind> = {
  'ir-jz120': 'cab-2x12',
  'ir-dr112': 'cab-1x12',
  'ir-bs410': 'cab-4x10',
  'ir-a212': 'cab-2x12',
  'ir-tr212': 'cab-2x12',
  'ir-1960': 'cab-4x12',
  'ir-gb412': 'cab-4x12',
  'ir-v412': 'cab-4x12',
  'ir-agldb810': 'cab-8x10',
  'ir-sv810': 'cab-8x10',
  'ir-sv410': 'cab-4x10',
  'ir-sv212': 'cab-2x12',
  'ir-mkb410': 'cab-4x10',
  'ir-trc410': 'cab-4x10',
  'ir-eden410': 'cab-4x10',
  'ir-bassguy410': 'cab-4x10',
  'ir-md45': 'acoustic',
  'ir-ghbird': 'acoustic',
  'ir-gj15': 'acoustic',
  'ir-user': 'user-ir',
};

const MIC_KIND: Record<string, DeviceKind> = {
  DYN421: 'mic-dynamic',
  S57: 'mic-dynamic',
  B52: 'mic-dynamic',
  U87: 'mic-condenser',
  C414: 'mic-condenser',
  C3000: 'mic-condenser',
  R121: 'mic-ribbon',
  R122: 'mic-ribbon',
};

/** Sagoma del microfono per la voce `mic` di un IR (nome come sulla pedaliera). */
export const micKindFor = (label: string | undefined): DeviceKind => (label && MIC_KIND[label]) || 'mic-dynamic';

/** Manopole del pedale: i parametri a manopola del modello, da 1 a 4. */
function stompKnobs(type: EffectType, modelId: string): number {
  const model = MG30_MODELS[type]?.find((m) => m.id === modelId);
  const count = model ? model.parameters.filter((p) => !p.options).length : 3;
  return Math.min(4, Math.max(1, count));
}

export function deviceArtFor(type: EffectType, modelId: string): DeviceArtSpec {
  switch (type) {
    case 'wah': return { kind: 'wah' };
    case 'vol': return { kind: 'expression' };
    case 'sr': return { kind: 'send-return' };
    case 'eq': return { kind: 'eq' };
    case 'amp':
      return { kind: 'amp', model: modelId };
    case 'ir': return { kind: CAB_KIND[modelId] ?? 'cab-4x12' };
    default: return { kind: 'stomp', knobs: stompKnobs(type, modelId) };
  }
}

export { CAB_KIND, MIC_KIND };
