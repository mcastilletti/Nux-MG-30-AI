'use client';

import React, { memo, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/common/panel';
import { CATEGORY_SHORT, categoryColor } from '@/components/common/category-chip';
import { DeviceArt } from '@/components/device-art';
import { deviceArtFor } from '@/lib/device-art-map';
import { MG30_MODELS } from '@/lib/mg30-data';
import { cn } from '@/lib/utils';
import type { EffectState } from '@/types/preset';

/**
 * Catena degli effetti: una fila di dispositivi, ognuno con la sagoma di ciò che è (pedale, wah, testata,
 * cassa, pedale d'espressione…), il colore della sua categoria e un LED. Sotto `lg` la fila scorre in
 * orizzontale con una sfumatura a destra che segnala che c'è altro; da `lg` sta tutta in una riga.
 */
export const SignalChain = memo(function SignalChain({ effects, selectedBlockId, handleSelectBlock, handleToggleBlock, exitBlockEditor }: {
  effects: EffectState[];
  selectedBlockId: string;
  handleSelectBlock: (effectId: string, type: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
  exitBlockEditor: () => void;
}) {
  const active = effects.filter((e) => e.enabled).length;
  return (
    <Panel variant="inset" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 pt-3 md:px-4">
        <div className="flex items-baseline gap-2">
          <h2 className="section-kicker">Catena</h2>
          <span className="text-caption text-muted-foreground">{active} di {effects.length} accesi</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-caption" onClick={exitBlockEditor}>
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Chiudi
        </Button>
      </div>
      <div className="relative">
        <div className="flex snap-x snap-proximity gap-2 overflow-x-auto px-3 pb-3 pt-2 [scrollbar-width:none] md:px-4 lg:grid lg:grid-cols-12 lg:gap-1.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
          {effects.map((effect) => (
            <ChainBlock
              key={effect.id}
              effect={effect}
              isSelected={selectedBlockId === effect.id}
              handleSelectBlock={handleSelectBlock}
              handleToggleBlock={handleToggleBlock}
            />
          ))}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-inset to-transparent lg:hidden" />
      </div>
    </Panel>
  );
});

/**
 * Un blocco della catena: si ridisegna solo se cambiano il suo effetto o la selezione.
 * Il LED ON/OFF è un pulsante fratello di quello del blocco, non annidato (E2):
 * stessa posizione visiva, area di tocco allargata.
 */
const ChainBlock = memo(function ChainBlock({ effect, isSelected, handleSelectBlock, handleToggleBlock }: {
  effect: EffectState;
  isSelected: boolean;
  handleSelectBlock: (effectId: string, type: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const spec = deviceArtFor(effect.type, effect.model);
  const modelName = MG30_MODELS[effect.type]?.find((m) => m.id === effect.model)?.name ?? effect.model;
  const isEnabled = effect.enabled;

  // La selezione (anche da un altro punto) porta la tessera dentro la fascia che scorre.
  useEffect(() => {
    if (isSelected) ref.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [isSelected]);

  return (
    <div ref={ref} className="relative w-[4.25rem] shrink-0 snap-start lg:w-auto lg:min-w-0">
      <button
        type="button"
        onClick={() => handleSelectBlock(effect.id, effect.type)}
        aria-label={`Apri ${effect.type}`}
        aria-pressed={isSelected}
        title={modelName}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 pb-1.5 pt-2 transition-colors',
          isSelected ? 'border-primary bg-card' : 'border-transparent hover:bg-card/60',
        )}
      >
        <DeviceArt kind={spec.kind} knobs={spec.knobs} model={spec.model} color={categoryColor(effect.type)} on={isEnabled} size={60} className="lg:h-[72px] lg:w-auto" />
        <span className={cn('font-code text-micro font-bold', isSelected ? 'text-primary' : isEnabled ? 'text-foreground' : 'text-muted-foreground')}>
          {CATEGORY_SHORT[effect.type]}
        </span>
        <span className="hidden w-full truncate text-center text-micro text-muted-foreground lg:block">{modelName}</span>
      </button>
      <button
        type="button"
        onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)}
        // Nome stabile + aria-pressed: "Accensione wah, premuto" = acceso.
        aria-label={`Accensione ${effect.type}`}
        aria-pressed={isEnabled}
        title={isEnabled ? 'Disattiva blocco' : 'Attiva blocco'}
        className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary after:absolute after:-inset-3 after:content-['']"
      >
        <span
          aria-hidden="true"
          className={cn('h-2.5 w-2.5 rounded-full border transition-colors', isEnabled ? 'border-success bg-success' : 'border-muted-foreground/60 bg-transparent')}
        />
      </button>
    </div>
  );
});
