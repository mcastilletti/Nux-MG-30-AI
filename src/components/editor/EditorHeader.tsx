'use client';

import React, { memo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Layers, MoreVertical, Pencil, Redo2, RefreshCw, Save, Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/common/icon-button';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import type { Preset } from '@/types/preset';
import { AiModeDialog } from './AiModeDialog';
import { CopySceneDialog } from './CopySceneDialog';

/**
 * Intestazione dell'editor su due righe (IA approvata in Fase 1, E1/E10):
 * - riga 1: ‹ slot › · nome del preset (fino a 2 righe) · menu ⋮ (sotto lg);
 * - riga 2: scene 1-2-3 · azioni (solo da lg) · SALVA, sempre visibile.
 */
export const EditorHeader = memo(function EditorHeader({
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
  const [aiOpen, setAiOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const connected = status === 'connected';
  const canSend = connected && !isEditorSyncing;

  const saveEditorPresetName = () => {
    const nextName = presetNameDraft.trim();
    if (!nextName) return;
    onRenamePreset(nextName);
    setIsEditingPresetName(false);
  };

  return (
    <div className="app-surface space-y-3 rounded-2xl p-3 md:p-4">
      {/* Riga 1: slot, nome, menu */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <div className="flex shrink-0 items-center">
          <IconButton label="Preset precedente" className="rounded-full" onClick={(e) => { e.stopPropagation(); handleSlotChange('prev'); }}>
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <div className="flex h-12 w-[4.25rem] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">{formatSlotLabel(activePreset.slot)}</div>
          <IconButton label="Preset successivo" className="rounded-full" onClick={(e) => { e.stopPropagation(); handleSlotChange('next'); }}>
            <ChevronRight className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1">
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
              className="h-11 w-full text-lg font-bold md:text-xl"
              aria-label="Modifica nome preset"
            />
          ) : (
            <PresetPicker
              slot={activePreset.slot}
              displayName={getPresetDisplayName(activePreset)}
              devicePresets={devicePresets}
              getPresetDisplayName={getPresetDisplayName}
              onSelect={handlePresetSelect}
            />
          )}
          {!isEditingPresetName && (
            <IconButton
              label="Modifica nome preset"
              className="hidden text-muted-foreground hover:text-primary lg:inline-flex"
              onClick={() => { setPresetNameDraft(activePreset.name); setIsEditingPresetName(true); }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {/* Sotto lg le azioni secondarie sono nel menu: SALVA resta sempre visibile. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Altre azioni sul preset" variant="outline" className="rounded-xl lg:hidden">
              <MoreVertical className="h-5 w-5" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => { setPresetNameDraft(activePreset.name); setIsEditingPresetName(true); }}>
              <Pencil className="h-4 w-4" /> Rinomina preset
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => setAiOpen(true)}>
              <Sparkles className="h-4 w-4 text-primary" /> AI Mode
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => setCopyOpen(true)}>
              <Copy className="h-4 w-4" /> Copia scena
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={undo}>
              <Undo2 className="h-4 w-4" /> Annulla ultima modifica
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={redo}>
              <Redo2 className="h-4 w-4" /> Ripristina modifica
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={handleSyncFromHardware}>
              <Download className="h-4 w-4" /> Leggi il nome dalla pedaliera
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" disabled={!canSend} onSelect={() => syncFullPreset(activePreset)}>
              <RefreshCw className={cn('h-4 w-4', isEditorSyncing && 'animate-spin')} /> Invia il preset alla pedaliera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Riga 2: scene, azioni (lg), SALVA */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1" role="group" aria-label="Scene">
          <span className="hidden items-center gap-1 px-2 text-caption font-black uppercase text-muted-foreground sm:flex"><Layers className="h-3 w-3" aria-hidden="true" /> Scene</span>
          {[0, 1, 2].map((idx) => (
            <Button
              key={`scene-btn-${idx}`}
              variant={activePreset.activeScene === idx ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSceneChange(idx)}
              aria-pressed={activePreset.activeScene === idx}
              aria-label={`Scena ${idx + 1}`}
              className={cn(
                'h-11 w-11 font-bold transition-all',
                activePreset.activeScene === idx ? 'bg-primary shadow-lg' : 'text-muted-foreground'
              )}
            >
              {idx + 1}
            </Button>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => setCopyOpen(true)}>
            <Copy className="h-4 w-4" /> Copia scena
          </Button>
          <Button variant="outline" className="min-h-11 gap-2 border-primary/50 text-primary" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> AI Mode
          </Button>
          <IconButton label="Leggi il nome del preset dalla pedaliera" variant="outline" onClick={handleSyncFromHardware}>
            <Download className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Invia il preset alla pedaliera"
            title={connected ? 'Invia il preset alla pedaliera' : 'Invia il preset alla pedaliera (pedaliera non collegata)'}
            variant="outline"
            disabled={!canSend}
            onClick={() => syncFullPreset(activePreset)}
          >
            <RefreshCw className={cn('h-4 w-4', isEditorSyncing && 'animate-spin')} />
          </IconButton>
          <IconButton label="Annulla ultima modifica" variant="outline" onClick={undo}><Undo2 className="h-4 w-4" /></IconButton>
          <IconButton label="Ripristina modifica" variant="outline" onClick={redo}><Redo2 className="h-4 w-4" /></IconButton>
        </div>

        <Button className="ml-auto min-h-11 shrink-0 gap-2 px-5 font-bold" onClick={handleSave}>
          <Save className="h-4 w-4" /> SALVA
        </Button>
      </div>

      <CopySceneDialog open={copyOpen} onOpenChange={setCopyOpen} activePreset={activePreset} devicePresets={devicePresets} getPresetDisplayName={getPresetDisplayName} onCopy={onCopyScene} />
      <AiModeDialog open={aiOpen} onOpenChange={setAiOpen} activePreset={activePreset} setActivePreset={setActivePreset} />
    </div>
  );
});

/**
 * Menu dei 128 preset, separato dall'intestazione (M6): si ridisegna solo se
 * cambiano slot, nome, libreria o nomi salvati, non a ogni giro di manopola.
 */
const PresetPicker = memo(function PresetPicker({ slot, displayName, devicePresets, getPresetDisplayName, onSelect }: {
  slot: number;
  displayName: string;
  devicePresets: Preset[];
  getPresetDisplayName: (preset: Preset) => string;
  onSelect: (value: string) => void;
}) {
  return (
    <Select value={String(slot)} onValueChange={onSelect}>
      <SelectTrigger
        className="h-auto min-h-11 w-full min-w-0 justify-start border-0 bg-transparent px-0 py-0 text-left text-lg font-bold leading-tight shadow-none hover:text-primary focus:ring-0 md:text-xl [&>span]:line-clamp-2 [&>span]:whitespace-normal [&>span]:break-words"
        aria-label="Seleziona preset"
        title={displayName}
      >
        <SelectValue placeholder="Seleziona preset">{displayName}</SelectValue>
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
  );
});
