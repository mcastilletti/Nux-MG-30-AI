"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { usePresetStore, cloneEffects } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Preset } from '@/types/preset';
import { usePresetNames } from '@/hooks/use-preset-names';
import { useSavePreset } from '@/hooks/use-preset-persistence';
import { formatSlotLabel } from '@/lib/slot';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { SignalChain } from '@/components/editor/SignalChain';
import { BlockParamsPanel } from '@/components/editor/BlockParamsPanel';

export default function EditorPage() {
  const { activePreset, updateParameter, updateModel, updateScene, toggleEffect, undo, redo, setActivePreset, updatePresetName, copyScene } = usePresetStore();
  const { status, devicePresets, sendProgramChange, sendKnobParameter, sendModelChange, sendSceneChange, toggleBlock, enterBlockEditor, exitBlockEditor, isEditorSyncing, syncActivePreset, syncFullPreset } = useMidiStore();
  const { toast } = useToast();
  const { savedNames, savePresetName } = usePresetNames();
  const savePreset = useSavePreset();

  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');

  const selectedEffect = useMemo(() =>
    activePreset.effects.find(e => e.id === selectedBlockId),
    [activePreset.effects, selectedBlockId]
  );

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  // Rispecchia continuamente il preset in editing nella libreria devicePresets:
  // senza questo, cambiare slot (o copiare una scena) scarta ogni modifica non
  // ancora sincronizzata con l'hardware.
  useEffect(() => {
    useMidiStore.getState().commitPreset(activePreset);
  }, [activePreset]);

  const handleParamChange = (effectType: string, paramId: string, value: number, index: number) => {
    updateParameter(selectedBlockId, paramId, value);
    if (status === 'connected') {
      // Le CC sono indicizzate per tipo di blocco: l'id ('ng', 'cmp', 'mod') non le trova.
      sendKnobParameter(effectType, index, value);
    }
  };

  const handleModelChange = (effectId: string, type: string, modelId: string) => {
    updateModel(effectId, modelId);
    if (status === 'connected') {
      sendModelChange(type, modelId);
    }
  };

  const handleSceneChange = (index: number) => {
    updateScene(index);
    if (status === 'connected') {
      sendSceneChange(index);
    }
  };

  const handleSelectBlock = (effectId: string, type: string) => {
    setSelectedBlockId(effectId);
    if (status === 'connected') {
      enterBlockEditor(type);
    }
  };

  const handleToggleBlock = (e: React.MouseEvent, effectId: string, type: string, currentEnabled: boolean) => {
    e.stopPropagation();
    toggleEffect(effectId);
    if (status === 'connected') {
      toggleBlock(type, !currentEnabled);
    }
  };

  const handleSlotChange = (direction: 'next' | 'prev') => {
    let nextSlot = activePreset.slot + (direction === 'next' ? 1 : -1);
    if (nextSlot < 1) nextSlot = 128;
    if (nextSlot > 128) nextSlot = 1;
    sendProgramChange(nextSlot - 1);
    const nextPreset = devicePresets.find((preset) => preset.slot === nextSlot);
    if (nextPreset) {
      setActivePreset({ ...nextPreset, name: getPresetDisplayName(nextPreset) });
    } else {
      setActivePreset({ ...activePreset, slot: nextSlot });
    }
  };

  const getPresetDisplayName = (preset: Preset) =>
    savedNames[preset.slot] || preset.name || formatSlotLabel(preset.slot);

  const handleRenamePreset = (nextName: string) => {
    updatePresetName(nextName);
    savePresetName(activePreset.slot, nextName);
    useMidiStore.getState().updatePresetName(activePreset.slot, nextName);
  };

  const handlePresetSelect = (value: string) => {
    const slot = Number(value);
    const preset = devicePresets.find((item) => item.slot === slot);
    if (!preset || preset.slot === activePreset.slot) return;

    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }

    setActivePreset({ ...preset, name: getPresetDisplayName(preset) });
  };

  const handleCopyScene = (sourceScene: number, targetSlot: number, targetScene: number) => {
    const targetPresetRaw = devicePresets.find((preset) => preset.slot === targetSlot) || activePreset;

    const updatedTarget = copyScene(sourceScene, targetPresetRaw, targetScene);

    const destination: Preset = {
      ...updatedTarget,
      slot: targetSlot,
      activeScene: targetScene,
      effects: cloneEffects(updatedTarget.scenes![targetScene]),
      name: getPresetDisplayName(updatedTarget),
      lastModified: new Date(),
    };

    useMidiStore.setState((state) => ({
      devicePresets: state.devicePresets.map((preset) => preset.slot === targetSlot ? destination : preset),
    }));

    // Posiziona l'app direttamente sul preset e sulla scena di destinazione
    setActivePreset(destination);

    if (status === 'connected') {
      if (activePreset.slot !== targetSlot) {
        // skipAutoSync=true: evita che syncActivePreset() imposti isEditorSyncing
        // per 2s, che altrimenti farebbe fallire silenziosamente la syncFullPreset
        // qui sotto (race condition: la copia verso un altro slot non arriverebbe mai all'hardware).
        sendProgramChange(targetSlot - 1, true);
        setTimeout(() => {
          sendSceneChange(targetScene);
          syncFullPreset(destination);
        }, 300);
      } else {
        sendSceneChange(targetScene);
        syncFullPreset(destination);
      }
    }

    toast({
      title: 'Scena copiata e attivata',
      description: `Posizionato su ${formatSlotLabel(targetSlot)} / Scena ${targetScene + 1}. Duplicata da Scena ${sourceScene + 1}.`,
    });
  };

  const handleSave = async () => {
    // Garantisce che la libreria rifletta il preset anche se il commit continuo
    // (vedi useEffect su activePreset) venisse rimosso in futuro.
    useMidiStore.getState().commitPreset(activePreset);
    const result = await savePreset(activePreset);
    const saved = {
      cloud: { title: 'Preset salvato', description: `'${activePreset.name}' è salvato nel tuo account.` },
      queued: { title: 'Preset salvato', description: `'${activePreset.name}' è salvato su questo dispositivo e verrà sincronizzato con il tuo account appena torni online.` },
      local: { title: 'Preset salvato su questo dispositivo', description: 'Accedi con Google dal menu laterale per sincronizzarlo con il tuo account.' },
      'local-error': { title: 'Salvato solo su questo dispositivo', description: 'Il salvataggio nel tuo account non è riuscito. Riprova più tardi.' },
    }[result];

    if (status !== 'connected') {
      toast({ ...saved, variant: result === 'local-error' ? 'destructive' : undefined });
      return;
    }
    if (useMidiStore.getState().isEditorSyncing) {
      toast({
        title: saved.title,
        description: `${saved.description} Invio alla pedaliera non eseguito: sincronizzazione già in corso, premi di nuovo Salva tra poco.`,
        variant: 'destructive',
      });
      return;
    }
    syncFullPreset(activePreset);
    toast({
      title: saved.title,
      description: `${saved.description} Invio dei parametri (scena attiva) alla MG-30 in corso.`,
      variant: result === 'local-error' ? 'destructive' : undefined,
    });
  };

  const handleSyncFromHardware = () => {
    if (status !== 'connected') {
      toast({
        title: "Pedaliera non connessa",
        description: "Connetti la pedaliera per sincronizzare i dati.",
        variant: "destructive"
      });
      return;
    }

    // Richiede il nome del preset alla pedaliera
    syncActivePreset();

    toast({
      title: "Sincronizzazione automatica attiva",
      description: "Modifica i parametri sulla pedaliera e l'editor si aggiornerà automaticamente in tempo reale.",
    });
  };

  return (
    <>
      <div className="relative mx-auto max-w-[1440px] space-y-5 py-1 md:space-y-6 md:py-2">
        {isEditorSyncing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
            <Card role="status" aria-live="polite" className="p-8 flex flex-col items-center gap-4 shadow-2xl border-primary/40 bg-card">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-bold">Hardware Sync...</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Sincronizzazione in corso</p>
              </div>
            </Card>
          </div>
        )}

        <EditorHeader
          activePreset={activePreset}
          devicePresets={devicePresets}
          status={status}
          isEditorSyncing={isEditorSyncing}
          getPresetDisplayName={getPresetDisplayName}
          handleSlotChange={handleSlotChange}
          handlePresetSelect={handlePresetSelect}
          onRenamePreset={handleRenamePreset}
          handleSceneChange={handleSceneChange}
          onCopyScene={handleCopyScene}
          setActivePreset={setActivePreset}
          handleSyncFromHardware={handleSyncFromHardware}
          syncFullPreset={syncFullPreset}
          undo={undo}
          redo={redo}
          handleSave={handleSave}
        />

        <SignalChain
          effects={activePreset.effects}
          selectedBlockId={selectedBlockId}
          handleSelectBlock={handleSelectBlock}
          handleToggleBlock={handleToggleBlock}
          exitBlockEditor={exitBlockEditor}
        />

        {selectedEffect && (
          <BlockParamsPanel
            selectedEffect={selectedEffect}
            handleModelChange={handleModelChange}
            handleToggleBlock={handleToggleBlock}
            handleParamChange={handleParamChange}
          />
        )}
      </div>
    </>
  );
}
