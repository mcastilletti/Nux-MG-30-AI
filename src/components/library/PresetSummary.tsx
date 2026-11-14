import * as React from 'react';
import { CATEGORY_SHORT, categoryColor } from '@/components/common/category-chip';
import { DeviceArt } from '@/components/device-art';
import { deviceArtFor } from '@/lib/device-art-map';
import { MG30_MODELS } from '@/lib/mg30-data';
import { cn } from '@/lib/utils';
import type { EffectState } from '@/types/preset';

/** Nome del modello di ampli di un preset (come sulla pedaliera). */
export function presetAmpName(effects: EffectState[]): string {
  const amp = effects.find((e) => e.type === 'amp');
  if (!amp) return '—';
  return MG30_MODELS.amp.find((m) => m.id === amp.model)?.name ?? amp.model;
}

/** Blocchi accesi, nell'ordine della catena, senza Volume e Send/Return (sempre presenti, non identificano un suono). */
export const activeBlocks = (effects: EffectState[]) => effects.filter((e) => e.enabled && e.type !== 'vol' && e.type !== 'sr');

/**
 * Riassunto di un preset a colpo d'occhio: l'ampli disegnato col suo nome e un pallino colorato per ogni
 * blocco acceso (colore = categoria). `compact` toglie il disegno, per le righe degli elenchi.
 */
export function PresetSummary({ effects, compact = false, className }: { effects: EffectState[]; compact?: boolean; className?: string }) {
  const amp = effects.find((e) => e.type === 'amp');
  const spec = amp ? deviceArtFor('amp', amp.model) : null;
  const blocks = activeBlocks(effects);
  const chips = (
    <ul className="flex flex-wrap gap-x-2.5 gap-y-1" aria-label="Blocchi accesi">
      {blocks.map((e) => (
        <li key={e.id} className="flex items-center gap-1 text-caption font-semibold text-soft">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: categoryColor(e.type) }} />
          {CATEGORY_SHORT[e.type]}
        </li>
      ))}
    </ul>
  );
  if (compact) return <div className={className}>{chips}</div>;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {spec && amp && (
        <div className="shrink-0 rounded-lg bg-inset p-1.5">
          <DeviceArt kind={spec.kind} knobs={spec.knobs} model={spec.model} color={categoryColor('amp')} on={amp.enabled} size={52} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="truncate text-sm font-bold">{presetAmpName(effects)}</div>
        {chips}
      </div>
    </div>
  );
}
