"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Undo2, Redo2, Save, Power, LayoutGrid, ChevronLeft, ChevronRight, Settings2, Sparkles, Loader2, RefreshCw, CheckCircle2, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MG30_MODELS } from '@/lib/mg30-data';
import { generateMG30Preset, MG30PresetOutput } from '@/ai/flows/mg30-preset-gen';
import { useToast } from '@/hooks/use-toast';

const getBlockColorVar = (type: string) => {
  switch(type) {
    case 'wah': return '300 100% 75%';
    case 'noise-gate': return '70 100% 50%';
    case 'compressor': return '60 100% 50%';
    case 'efx': return '32 100% 50%';
    case 'amp': return '0 100% 50%';
    case 'ir': return '192 100% 50%';
    case 'sr': return '120 100% 50%';
    case 'modulation': return '220 100% 50%';
    case 'delay': return '180 100% 50%';
    case 'reverb': return '288 100% 50%';
    case 'vol': return '0 0% 80%';
    case 'eq': return '0 0% 100%';
    default: return 'var(--primary)';
  }
};

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

export default function EditorPage() {
  const { activePreset, updateParameter, updateModel, updateScene, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendProgramChange, sendKnobParameter, sendModelChange, sendSceneChange, toggleBlock, enterBlockEditor, exitBlockEditor, isEditorSyncing, syncActivePreset, syncFullPreset } = useMidiStore();
  const { toast } = useToast();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposedPreset, setProposedPreset] = useState<MG30PresetOutput | null>(null);

  const selectedEffect = useMemo(() => 
    activePreset.effects.find(e => e.id === selectedBlockId),
    [activePreset.effects, selectedBlockId]
  );

  const currentModelData = useMemo(() => {
    if (!selectedEffect) return null;
    return MG30_MODELS[selectedEffect.type as any]?.find(m => m.id === selectedEffect.model) || MG30_MODELS[selectedEffect.type as any]?.[0];
  }, [selectedEffect]);

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const handleParamChange = (effectType: string, paramId: string, value: number, index: number) => {
    updateParameter(selectedBlockId, paramId, value);
    if (status === 'connected') {
      sendKnobParameter(selectedBlockId, index, value);
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
    setActivePreset({ ...activePreset, slot: nextSlot });
  };

  const handleSave = () => {
    if (status === 'connected') {
      syncFullPreset(activePreset);
      toast({ 
        title: "Hardware Save", 
        description: `Salvataggio di '${activePreset.name}' in corso...` 
      });
    } else {
      toast({ 
        title: "Local Save", 
        description: "Pedaliera non connessa. Preset aggiornato localmente." 
      });
    }
  };

  const handleAiModeGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setProposedPreset(null);
    try {
      const result = await generateMG30Preset({ description: aiPrompt });
      setProposedPreset(result);
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate');
      toast({ 
        title: isRateLimit ? "Limite AI raggiunto" : "Errore AI", 
        description: isRateLimit ? "Attendi un minuto prima di generare un altro suono." : error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyProposedPreset = () => {
    if (!proposedPreset) return;
    
    const updatedEffects = activePreset.effects.map(effect => {
      const propEffect = proposedPreset.effects.find(pe => pe.type === effect.type);
      
      if (propEffect) {
        const paramRecord: Record<string, number> = {};
        if (propEffect.parameters) {
          propEffect.parameters.forEach(p => {
            paramRecord[p.name.toLowerCase()] = p.value;
          });
        }

        return {
          ...effect,
          model: propEffect.model || effect.model,
          enabled: propEffect.enabled ?? effect.enabled,
          parameters: { ...effect.parameters, ...paramRecord }
        };
      }
      return effect;
    });

    const newPreset = {
      ...activePreset,
      name: proposedPreset.name,
      effects: updatedEffects,
      lastModified: new Date()
    };

    setActivePreset(newPreset);
    
    toast({ 
      title: "AI Tone Applied", 
      description: `Il preset '${proposedPreset.name}' è pronto. Clicca SAVE per sincronizzare la pedaliera.` 
    });
    
    setProposedPreset(null);
    setIsAiModalOpen(false);
    setAiPrompt('');
  };

  const availableModels = selectedEffect ? MG30_MODELS[selectedEffect.type as any] || [] : [];
  const currentBlockColor = selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'hsl(var(--primary))';

  return (
    <AppShell>
      <div className="space-y-6 relative">
        {isEditorSyncing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
            <Card className="p-8 flex flex-col items-center gap-4 shadow-2xl border-primary/40 bg-card">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-bold">Hardware Sync...</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Sincronizzazione in corso</p>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer hover:bg-secondary/20 p-2 rounded-lg transition-colors group">
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleSlotChange('prev'); }} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-xl text-primary border border-primary/20">{formatSlotLabel(activePreset.slot)}</div>
              <button onClick={(e) => { e.stopPropagation(); handleSlotChange('next'); }} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div>
              <h3 className="text-xl font-bold">{activePreset.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">MG-30 CONNECTED</Badge>
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-primary/30">SCENE {activePreset.activeScene + 1}</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             {/* Scene Selector */}
             <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border">
                <div className="px-2 text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Scenes</div>
                {[0, 1, 2].map((idx) => (
                  <Button 
                    key={`scene-btn-${idx}`}
                    variant={activePreset.activeScene === idx ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleSceneChange(idx)}
                    className={cn(
                      "h-8 w-10 font-bold transition-all",
                      activePreset.activeScene === idx ? "bg-primary shadow-lg scale-105" : "text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </Button>
                ))}
             </div>

             <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />

            <div className="flex items-center gap-2">
              <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/50 text-primary">
                    <Sparkles className="w-4 h-4" /> AI Mode
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  {!proposedPreset ? (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Tone Designer</DialogTitle>
                        <DialogDescription>Descrivi il suono desiderato. L'AI configurerà modelli e parametri hardware.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Textarea 
                          placeholder="Es: Suono Gilmour anni '70 con molto delay e un ampli clean..." 
                          value={aiPrompt} 
                          onChange={(e) => setAiPrompt(e.target.value)} 
                          className="min-h-[150px] bg-secondary/20"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAiModeGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full">
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          Genera Preset
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Preset Generato: {proposedPreset.name}</DialogTitle>
                        <DialogDescription>L'AI ha selezionato i modelli e i parametri migliori.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs italic">
                          "{proposedPreset.explanation}"
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setProposedPreset(null)}>Scarta</Button>
                        <Button onClick={applyProposedPreset} className="bg-green-600 hover:bg-green-700 text-white flex-1">Applica all'Editor</Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              <div className="hidden sm:block w-[1px] h-8 bg-border mx-1" />
              <Button variant="outline" size="icon" onClick={() => syncActivePreset()} title="Sync Hardware"><RefreshCw className={cn("w-4 h-4", isEditorSyncing && "animate-spin")} /></Button>
              <Button variant="outline" size="icon" onClick={undo} title="Undo"><Undo2 className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" onClick={redo} title="Redo"><Redo2 className="w-4 h-4" /></Button>
              <Button className="gap-2" onClick={handleSave}><Save className="w-4 h-4" /> SAVE</Button>
            </div>
          </div>
        </div>

        <Card className="border-border bg-background/50 overflow-hidden shadow-lg">
          <CardHeader className="py-3 border-b border-border bg-secondary/20 flex flex-row items-center justify-between">
             <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Signal Chain</CardTitle>
             <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-bold gap-2" onClick={exitBlockEditor}><X className="w-3 h-3" /> Close Editor</Button>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-6xl mx-auto overflow-x-auto gap-4 pb-2 px-4">
              {activePreset.effects.map((effect, idx) => {
                const isSelected = selectedBlockId === effect.id;
                const blockColor = getBlockColorVar(effect.type);
                return (
                  <React.Fragment key={effect.id}>
                    <div 
                      onClick={() => handleSelectBlock(effect.id, effect.type)}
                      className={cn(
                        "relative cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-shrink-0 select-none",
                        "bg-secondary/40",
                        isSelected ? "scale-105 shadow-md" : "border-border/40",
                        !effect.enabled && "opacity-60"
                      )}
                      style={{ borderColor: isSelected ? `hsl(${blockColor})` : '' }}
                    >
                      <div 
                        onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)}
                        className="w-10 h-10 rounded-md flex items-center justify-center mb-1 bg-background/60 border border-border/50 hover:bg-background/80 transition-colors"
                      >
                        <Power className="w-5 h-5" style={{ color: effect.enabled ? `hsl(${blockColor})` : 'gray' }} />
                      </div>
                      <span className="text-[9px] font-bold uppercase truncate" style={{ color: effect.enabled ? `hsl(${blockColor})` : 'gray' }}>
                        {effect.type}
                      </span>
                    </div>
                    {idx < activePreset.effects.length - 1 && <div className="flex-1 min-w-[20px] h-[2px] bg-border/40" />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedEffect && (
          <Card 
            className="shadow-xl" 
            style={{ borderColor: `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` }}
          >
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 gap-4">
                <div className="flex items-center gap-4">
                  <Settings2 className="w-5 h-5" style={{ color: `hsl(${getBlockColorVar(selectedEffect.type)})` }} />
                  <CardTitle className="text-lg uppercase" style={{ color: `hsl(${getBlockColorVar(selectedEffect.type)})` }}>
                    {selectedEffect?.type} <Badge variant="outline" className="text-[10px] ml-2">{selectedEffect?.model}</Badge>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedEffect?.model} onValueChange={(val) => handleModelChange(selectedEffect!.id, selectedEffect!.type, val)}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Model" /></SelectTrigger>
                    <SelectContent>{availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Switch checked={selectedEffect?.enabled} onCheckedChange={() => handleToggleBlock({ stopPropagation: () => {} } as any, selectedEffect!.id, selectedEffect!.type, selectedEffect!.enabled)} />
                </div>
              </CardHeader>
              <CardContent className="p-10">
                {currentModelData && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-8 justify-items-center">
                    {currentModelData.parameters.map((param, index) => (
                      <div key={param.id}>
                        <RotaryKnob label={param.name} value={Number(selectedEffect.parameters[param.id.toLowerCase()] ?? param.default)} min={param.min} max={param.max} step={param.step} onChange={(v) => handleParamChange(selectedEffect.type, param.id, v, index)} color={currentBlockColor} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        )}
      </div>
    </AppShell>
  );
}
