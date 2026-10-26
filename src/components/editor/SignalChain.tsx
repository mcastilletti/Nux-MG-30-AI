'use client';

import React, { memo } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BlockIcon } from '@/components/icons/block-icons';
import { cn } from '@/lib/utils';
import type { EffectState } from '@/types/preset';
import { getBlockColorVar } from './block-colors';

/** Catena degli effetti: selezione del blocco e chip ON/OFF. */
export const SignalChain = memo(function SignalChain({ effects, selectedBlockId, handleSelectBlock, handleToggleBlock, exitBlockEditor }: {
  effects: EffectState[];
  selectedBlockId: string;
  handleSelectBlock: (effectId: string, type: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
  exitBlockEditor: () => void;
}) {
  return (
    <Card className="app-surface overflow-hidden rounded-2xl bg-background/40 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 bg-secondary/20 py-3">
        <CardTitle className="section-kicker flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Signal Chain</CardTitle>
        <Button variant="ghost" size="sm" className="h-9 gap-2 text-label font-bold uppercase" onClick={exitBlockEditor}><X className="h-3.5 w-3.5" /> Chiudi</Button>
      </CardHeader>
      <CardContent className="py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-5 md:gap-4 md:px-8 md:py-6">
          {effects.map((effect, idx) => (
            <ChainBlock
              key={effect.id}
              effect={effect}
              isSelected={selectedBlockId === effect.id}
              isLast={idx === effects.length - 1}
              handleSelectBlock={handleSelectBlock}
              handleToggleBlock={handleToggleBlock}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Un blocco della catena: si ridisegna solo se cambiano il suo effetto o la selezione.
 * Il chip ON/OFF è un pulsante fratello di quello del blocco, non annidato (E2):
 * stessa posizione visiva, area di tocco allargata.
 */
const ChainBlock = memo(function ChainBlock({ effect, isSelected, isLast, handleSelectBlock, handleToggleBlock }: {
  effect: EffectState;
  isSelected: boolean;
  isLast: boolean;
  handleSelectBlock: (effectId: string, type: string) => void;
  handleToggleBlock: (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => void;
}) {
  const blockColor = getBlockColorVar(effect.type);
  const isEnabled = effect.enabled;
  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => handleSelectBlock(effect.id, effect.type)}
          aria-label={`Apri ${effect.type}`}
          aria-pressed={isSelected}
          className={cn(
            "relative flex h-[7.25rem] w-24 shrink-0 cursor-pointer flex-col items-stretch justify-between overflow-hidden rounded-xl border transition-all md:h-[8.25rem] md:w-28",
            isEnabled
              ? isSelected
                ? "border-2 shadow-[0_0_15px_hsla(var(--block-glow),0.35)]"
                : "border-border/60 hover:border-primary/50 bg-secondary/40"
              : isSelected
                ? "border-2 border-zinc-500 bg-zinc-950/80 shadow-md grayscale"
                : "border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/60 grayscale"
          )}
          style={{
            '--block-glow': blockColor,
            ...(isEnabled && isSelected ? { borderColor: `hsl(${blockColor})` } : {}),
            ...(isEnabled && effect.type === 'modulation' ? { backgroundColor: `hsl(${blockColor} / 0.12)` } : {})
          } as React.CSSProperties}
        >
          <div className="relative min-h-0 flex-1">
            <BlockIcon
              type={effect.type}
              className={cn(
                "absolute inset-1.5 transition-all",
                isEnabled
                  ? "drop-shadow-[0_0_8px_hsl(var(--icon-color)_/_0.7)]"
                  : "drop-shadow-none opacity-40"
              )}
              style={{
                '--icon-color': isEnabled ? blockColor : '0 0% 50%',
                color: isEnabled ? `hsl(${blockColor})` : 'hsl(0, 0%, 50%)'
              } as React.CSSProperties}
            />
          </div>
          <span
            className={cn(
              "truncate border-t px-2 py-2 text-label font-semibold uppercase tracking-wide transition-colors",
              isEnabled
                ? "border-border/50 text-foreground"
                : "border-zinc-800/80 text-zinc-400"
            )}
          >
            {effect.type === 'noise-gate' ? 'Gate' : effect.type === 'modulation' ? 'Mod' : effect.type}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)}
          aria-label={`Attiva ${effect.type}`}
          aria-pressed={isEnabled}
          title={isEnabled ? 'Disattiva blocco' : 'Attiva blocco'}
          className={cn(
            // Stessa posizione del chip annidato di prima: 6px dentro il bordo (1px, 2px se selezionato).
            "absolute rounded-md px-1.5 py-0.5 text-micro font-bold uppercase tracking-wide border transition-all hover:scale-105 cursor-pointer select-none",
            "outline-none focus-visible:ring-2 focus-visible:ring-primary",
            // Area di tocco allargata oltre il chip visibile.
            "after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-['']",
            isSelected ? "left-2 top-2" : "left-[7px] top-[7px]",
            isEnabled
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
              : "bg-zinc-800/90 text-zinc-400 border-zinc-700/60 hover:bg-zinc-700/80 hover:text-zinc-200"
          )}
        >
          {isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      {!isLast && (
        <div
          className={cn(
            "flex-1 min-w-[20px] h-[2px] transition-colors",
            isEnabled ? "bg-border/60" : "bg-zinc-800/50"
          )}
        />
      )}
    </>
  );
});
