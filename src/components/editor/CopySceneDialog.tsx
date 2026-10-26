'use client';

import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatSlotLabel } from '@/lib/slot';
import type { Preset } from '@/types/preset';

/** Copia della scena attiva su un'altra scena, anche di un altro preset. */
export function CopySceneDialog({ open, onOpenChange, activePreset, devicePresets, getPresetDisplayName, onCopy }: {
  /** Aperto dall'intestazione: pulsante su desktop, menu ⋮ su mobile. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePreset: Preset;
  devicePresets: Preset[];
  getPresetDisplayName: (preset: Preset) => string;
  onCopy: (sourceScene: number, targetSlot: number, targetScene: number) => void;
}) {
  const [copySourceScene, setCopySourceScene] = useState(String(activePreset.activeScene));
  const [copyTargetSlot, setCopyTargetSlot] = useState(String(activePreset.slot));
  const [copyTargetScene, setCopyTargetScene] = useState(String(activePreset.activeScene === 0 ? 1 : 0));

  // A ogni apertura il modulo riparte dal preset e dalla scena attivi.
  useEffect(() => {
    if (!open) return;
    setCopySourceScene(String(activePreset.activeScene));
    setCopyTargetSlot(String(activePreset.slot));
    setCopyTargetScene(String(activePreset.activeScene === 0 ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCopyScene = () => {
    onCopy(Number(copySourceScene), Number(copyTargetSlot), Number(copyTargetScene));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5 text-primary" /> Copia preset su scena</DialogTitle>
          <DialogDescription>
            Duplica esattamente la configurazione di tutti i blocchi e parametri da una scena all'altra.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scena Origine</label>
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center shrink-0 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-mono font-bold text-primary">
                {formatSlotLabel(activePreset.slot)}
              </div>
              <Select value={copySourceScene} onValueChange={setCopySourceScene}>
                <SelectTrigger aria-label="Scena di origine" className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map((scene) => (
                    <SelectItem key={scene} value={String(scene)}>Scena {scene + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Preset destinazione</label>
              <Select value={copyTargetSlot} onValueChange={setCopyTargetSlot}>
                <SelectTrigger aria-label="Preset destinazione"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[min(24rem,60vh)]">
                  {devicePresets.map((preset) => (
                    <SelectItem key={preset.slot} value={String(preset.slot)}>
                      <span className="font-mono text-primary">{formatSlotLabel(preset.slot)}</span>
                      <span className="ml-2">{getPresetDisplayName(preset)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scena Destinazione</label>
              <Select value={copyTargetScene} onValueChange={setCopyTargetScene}>
                <SelectTrigger aria-label="Scena destinazione"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map((scene) => (
                    <SelectItem key={scene} value={String(scene)}>Scena {scene + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleCopyScene}>Copia scena</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
