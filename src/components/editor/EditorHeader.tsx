'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Layers, Pencil, Redo2, RefreshCw, Save, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import type { Preset } from '@/types/preset';
import { AiModeDialog } from './AiModeDialog';
import { CopySceneDialog } from './CopySceneDialog';

/** Intestazione dell'editor: slot, nome, scene e azioni sul preset. */
export function EditorHeader({
  activePreset, devicePresets, status, isEditorSyncing, getPresetDisplayName,
  handleSlotChange, handlePresetSelect, onRenamePreset, handleSceneChange, onCopyScene,
  setActivePreset, handleSyncFromHardware, syncFullPreset, undo, redo, handleSave,
}: {
  activePreset: Preset;
  devicePresets: Preset[];
  status: string;
  isEditorSyncing: boolean;
  getPresetDisplayName: (preset: Preset) => string;
  handleSlotChange: (direction: 'next' | 'prev') => void;
  handlePresetSelect: (value: string) => void;
  onRenamePreset: (name: string) => void;
  handleSceneChange: (index: number) => void;
  onCopyScene: (sourceScene: number, targetSlot: number, targetScene: number) => void;
  setActivePreset: (preset: Preset) => void;
  handleSyncFromHardware: () => void;
  syncFullPreset: (preset: Preset) => void;
  undo: () => void;
  redo: () => void;
  handleSave: () => void;
}) {
  const [isEditingPresetName, setIsEditingPresetName] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState('');

  const saveEditorPresetName = () => {
    const nextName = presetNameDraft.trim();
    if (!nextName) return;
    onRenamePreset(nextName);
    setIsEditingPresetName(false);
  };

  return (
    <div className="app-surface flex flex-col gap-4 rounded-2xl p-3 md:p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition-colors md:gap-4">
        <div className="flex items-center gap-2">
          <button aria-label="Preset precedente" onClick={(e) => { e.stopPropagation(); handleSlotChange('prev'); }} className="touch-target rounded-full p-2 transition-colors hover:bg-secondary"><ChevronLeft className="mx-auto h-5 w-5" /></button>
          <div className="flex h-12 w-[4.5rem] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">{formatSlotLabel(activePreset.slot)}</div>
          <button aria-label="Preset successivo" onClick={(e) => { e.stopPropagation(); handleSlotChange('next'); }} className="touch-target rounded-full p-2 transition-colors hover:bg-secondary"><ChevronRight className="mx-auto h-5 w-5" /></button>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {isEditingPresetName ? (
              <Input
                autoFocus
                value={presetNameDraft}
                onChange={(event) => setPresetNameDraft(event.target.value)}
                onBlur={saveEditorPresetName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveEditorPresetName();
                  if (event.key === 'Escape') setIsEditingPresetName(false);
                }}
                className="h-8 w-full max-w-[19rem] text-lg font-bold md:text-xl"
                aria-label="Modifica nome preset"
              />
            ) : (
              <Select value={String(activePreset.slot)} onValueChange={handlePresetSelect}>
                <SelectTrigger
                  className="h-auto min-h-8 w-full max-w-[19rem] justify-start border-0 bg-transparent px-0 py-0 text-left text-lg font-bold shadow-none hover:text-primary focus:ring-0 md:text-xl"
                  aria-label="Seleziona preset"
                >
                  <SelectValue placeholder="Seleziona preset">{getPresetDisplayName(activePreset)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[min(24rem,60vh)]">
                  {devicePresets.map((preset) => (
                    <SelectItem key={preset.slot} value={String(preset.slot)}>
                      <span className="font-mono text-primary">{formatSlotLabel(preset.slot)}</span>
                      <span className="ml-2">{getPresetDisplayName(preset)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isEditingPresetName && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                aria-label="Modifica nome preset"
                title="Modifica nome preset"
                onClick={() => { setPresetNameDraft(activePreset.name); setIsEditingPresetName(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-label">{status === 'connected' ? 'MG-30 CONNECTED' : 'MG-30 OFFLINE'}</Badge>
            <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-label text-primary">SCENE {activePreset.activeScene + 1}</Badge>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 w-full flex-wrap items-center gap-2 md:gap-3 lg:w-auto lg:justify-end">
        {/* Scene Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1">
          <div className="px-2 text-label font-black uppercase text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Scenes</div>
          {[0, 1, 2].map((idx) => (
            <Button
              key={`scene-btn-${idx}`}
              variant={activePreset.activeScene === idx ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSceneChange(idx)}
              className={cn(
                "h-10 w-10 font-bold transition-all",
                activePreset.activeScene === idx ? "bg-primary shadow-lg scale-105" : "text-muted-foreground"
              )}
            >
              {idx + 1}
            </Button>
          ))}
        </div>

        <CopySceneDialog activePreset={activePreset} devicePresets={devicePresets} getPresetDisplayName={getPresetDisplayName} onCopy={onCopyScene} />

        <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />

        <div className="flex items-center gap-2">
          <AiModeDialog activePreset={activePreset} setActivePreset={setActivePreset} />
          <Button
            variant="outline"
            size="icon"
            className="touch-target"
            onClick={handleSyncFromHardware}
            title="Leggi il nome del preset dalla pedaliera"
            aria-label="Leggi il nome del preset dalla pedaliera"
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />
          <Button
            variant="outline"
            size="icon"
            className="touch-target"
            onClick={() => syncFullPreset(activePreset)}
            disabled={status !== 'connected' || isEditorSyncing}
            title={status === 'connected' ? "Invia il preset alla pedaliera" : "Invia il preset alla pedaliera (pedaliera non collegata)"}
            aria-label="Invia il preset alla pedaliera"
          >
            <RefreshCw className={cn("h-4 w-4", isEditorSyncing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon" className="touch-target" onClick={undo} title="Annulla" aria-label="Annulla ultima modifica"><Undo2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="touch-target" onClick={redo} title="Ripristina" aria-label="Ripristina modifica"><Redo2 className="h-4 w-4" /></Button>
          <Button className="touch-target shrink-0 gap-2 px-4 sm:px-5" onClick={handleSave}><Save className="h-4 w-4" /> <span className="hidden sm:inline">SALVA</span><span className="sm:hidden">SAVE</span></Button>
        </div>
      </div>
    </div>
  );
}
