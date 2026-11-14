import type { DeviceArtSpec, DeviceKind } from '@/components/device-art/types';
import { MG30_MODELS } from '@/lib/mg30-data';
import type { EffectType } from '@/types/preset';

/**
 * Quale sagoma disegnare per un modello. Ogni ampli ha il suo disegno (`amp` + id del modello, vedi
 * `amp-art.tsx`), ispirato all'ampli originale; i preamplificatori NUX (MLD, Optima Air) sono ampli
 * compatti. Gli altri blocchi hanno la sagoma di ciò che sono.
 */
/** IR che non sono una cassa: chitarre acustiche (simulazione) e IR dell'utente. */
const SPECIAL_IR: Record<string, DeviceKind> = {
  'ir-md45': 'acoustic',
  'ir-ghbird': 'acoustic',
  'ir-gj15': 'acoustic',
  'ir-user': 'user-ir',
};

const MIC_KIND: Record<string, DeviceKind> = {
  DYN421: 'mic-md421',
  S57: 'mic-sm57',
  B52: 'mic-beta52',
  U87: 'mic-u87',
  C414: 'mic-c414',
  C3000: 'mic-c3000',
  R121: 'mic-r121',
  R122: 'mic-r122',
};

/** Sagoma del microfono per la voce `mic` di un IR (nome come sulla pedaliera). */
export const micKindFor = (label: string | undefined): DeviceKind => (label && MIC_KIND[label]) || 'mic-sm57';

/** Manopole del pedale: i parametri a manopola del modello, da 1 a 4. */
function stompKnobs(type: EffectType, modelId: string): number {
  const model = MG30_MODELS[type]?.find((m) => m.id === modelId);
  const count = model ? model.parameters.filter((p) => !p.options).length : 3;
  return Math.min(4, Math.max(1, count));
}

export function deviceArtFor(type: EffectType, modelId: string): DeviceArtSpec {
  switch (type) {
    case 'wah': return { kind: 'wah', model: modelId };
    case 'vol': return { kind: 'expression' };
    case 'sr': return { kind: 'send-return' };
    case 'eq': return { kind: 'eq', model: modelId };
    case 'amp':
      return { kind: 'amp', model: modelId };
    case 'ir': return SPECIAL_IR[modelId] ? { kind: SPECIAL_IR[modelId] } : { kind: 'cab', model: modelId };
    default: return { kind: 'stomp', knobs: stompKnobs(type, modelId), model: modelId };
  }
}

export { SPECIAL_IR, MIC_KIND };
