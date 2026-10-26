
"use client"

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, RefreshCw, Loader2, Check, MoreVertical, LayoutGrid, List, Settings2, CloudOff, Cloud, CheckSquare, Square, X, Download, Upload, HardDriveDownload } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';
import { usePresetNames } from '@/hooks/use-preset-names';
import { useSavePreset } from '@/hooks/use-preset-persistence';
import { useUser } from '@/firebase';
import { Preset, EffectState } from '@/types/preset';
import { buildPresetExport, parsePresetImport } from '@/lib/preset-storage';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatSlotLabel } from '@/lib/slot';


export default function LibraryPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkVolumeMin, setBulkVolumeMin] = useState(30);
  const [bulkVolumeMax, setBulkVolumeMax] = useState(60);

  const { sendProgramChange, status, devicePresets, syncPresets, isSyncing, syncProgress, updatePresetName } = useMidiStore();
  const { setActivePreset, updatePresetName: updateActivePresetName } = usePresetStore();
  const { toast } = useToast();
  const { user } = useUser();

  // Nomi salvati su Firestore (o localStorage se non loggato)
  const { savedNames, savePresetName, isLoading: namesLoading } = usePresetNames();
  const savePreset = useSavePreset();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ presets: Preset[]; skipped: number; fileName: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const file = buildPresetExport(useMidiStore.getState().devicePresets);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mg30-preset-${file.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Preset esportati', description: `${file.presets.length} preset nel file ${a.download}.` });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = parsePresetImport(await file.text());
    if (!result.ok) {
      toast({ title: 'Importazione non riuscita', description: result.error, variant: 'destructive' });
      return;
    }
    setPendingImport({ presets: result.presets, skipped: result.skipped, fileName: file.name });
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setIsImporting(true);
    const imported = pendingImport.presets;
    const bySlot = new Map(imported.map(p => [p.slot, p]));
    useMidiStore.setState(state => ({ devicePresets: state.devicePresets.map(p => bySlot.get(p.slot) ?? p) }));
    const active = usePresetStore.getState().activePreset;
    const importedActive = bySlot.get(active.slot);
    if (importedActive) usePresetStore.setState({ activePreset: importedActive, history: [importedActive], historyIndex: 0 });
    const results = await Promise.all(imported.map(p => savePreset(p)));
    setIsImporting(false);
    setPendingImport(null);
    toast({
      title: 'Preset importati',
      description: `${imported.length} preset ${results.includes('local-error') ? 'salvati solo su questo dispositivo (salvataggio nel tuo account non riuscito)' : results.includes('local') ? 'salvati su questo dispositivo' : 'salvati'}. Nulla è stato inviato alla pedaliera.`,
      variant: results.includes('local-error') ? 'destructive' : undefined,
    });
  };

  /**
   * Restituisce il nome da mostrare per un preset:
   * 1. Nome salvato dall'utente (Firestore / localStorage)
   * 2. Codice slot (es. "01A") se non c'è un nome salvato
   */
  const getDisplayName = (preset: Preset): string =>
    savedNames[preset.slot] || formatSlotLabel(preset.slot);

  const filteredPresets = devicePresets.filter((p) => {
    const displayName = getDisplayName(p);
    return (
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      formatSlotLabel(p.slot).toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleSelection = (slot: number) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slot)) {
        newSet.delete(slot);
      } else {
        newSet.add(slot);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedSlots(new Set(filteredPresets.map(p => p.slot)));
  };

  const clearSelection = () => {
    setSelectedSlots(new Set());
  };

  const applyBulkVolume = async () => {
    if (selectedSlots.size === 0) {
      toast({
        title: 'Nessun preset selezionato',
        description: 'Seleziona almeno un preset per applicare le modifiche.',
        variant: 'destructive'
      });
      return;
    }

    // Aggiorna i preset nel MIDI store
    const { devicePresets } = useMidiStore.getState();
    const updatedPresets = devicePresets.map(preset => {
      if (selectedSlots.has(preset.slot)) {
        const updatedEffects = preset.effects.map(effect => {
          if (effect.type === 'vol') {
            return {
              ...effect,
              parameters: {
                ...effect.parameters,
                min: bulkVolumeMin,
                max: bulkVolumeMax
              }
            };
          }
          return effect;
        });

        // Aggiorna anche le scene se esistono
        const updatedScenes: Record<number, EffectState[]> | undefined = preset.scenes ? { ...preset.scenes } : undefined;
        if (preset.scenes && updatedScenes) {
          Object.keys(preset.scenes).forEach(sceneKey => {
            const sceneEffects = preset.scenes![Number(sceneKey)];
            updatedScenes[Number(sceneKey)] = sceneEffects.map(effect => {
              if (effect.type === 'vol') {
                return {
                  ...effect,
                  parameters: {
                    ...effect.parameters,
                    min: bulkVolumeMin,
                    max: bulkVolumeMax
                  }
                };
              }
              return effect;
            });
          });
        }

        return {
          ...preset,
          effects: updatedEffects,
          scenes: updatedScenes,
          lastModified: new Date()
        };
      }
      return preset;
    });

    useMidiStore.setState({ devicePresets: updatedPresets });

    // Il preset aperto nell'editor deve ricevere lo stesso volume, altrimenti
    // l'editor lo riscriverebbe con il valore precedente.
    const active = usePresetStore.getState().activePreset;
    const updatedActive = updatedPresets.find(p => p.slot === active.slot && selectedSlots.has(p.slot));
    if (updatedActive) setActivePreset(updatedActive);

    const count = selectedSlots.size;
    const results = await Promise.all(updatedPresets.filter(p => selectedSlots.has(p.slot)).map(p => savePreset(p)));
    const where = results.includes('local-error')
      ? 'Salvato solo su questo dispositivo: il salvataggio nel tuo account non è riuscito.'
      : results.includes('local')
        ? 'Salvato su questo dispositivo. Accedi per sincronizzarlo con il tuo account.'
        : results.includes('queued')
          ? 'Salvato; verrà sincronizzato con il tuo account appena torni online.'
          : 'Salvato nel tuo account.';
    toast({
      title: 'Volume salvato',
      description: `MIN ${bulkVolumeMin} / MAX ${bulkVolumeMax} su ${count} preset. ${where} Non viene inviato alla pedaliera: apri il preset nell'editor e premi Salva per inviarlo.`,
      variant: results.includes('local-error') ? 'destructive' : undefined,
    });

    clearSelection();
    setIsBulkMode(false);
  };

  const handleSelectPreset = (preset: Preset) => {
    if (isBulkMode) {
      toggleSelection(preset.slot);
      return;
    }

    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }
    setActivePreset({ ...preset, name: getDisplayName(preset) });
    toast({
      title: 'Preset Attivato',
      description: status === 'connected'
        ? `Slot ${formatSlotLabel(preset.slot)}: ${getDisplayName(preset)} selezionato sulla pedaliera.`
        : `Slot ${formatSlotLabel(preset.slot)}: ${getDisplayName(preset)} aperto nell'editor (pedaliera non collegata).`,
    });
  };

  const handleConfigurePreset = (e: React.MouseEvent, preset: Preset) => {
    e.stopPropagation();
    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }
    setActivePreset({ ...preset, name: getDisplayName(preset) });
    router.push('/editor');
  };

  const startEditingName = (e: React.MouseEvent, preset: Preset) => {
    e.stopPropagation();
    setEditingSlot(preset.slot);
    setEditName(savedNames[preset.slot] || '');
  };

  const saveName = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingSlot && editName.trim().length > 0) {
      // Aggiorna Zustand store (in-memory)
      updatePresetName(editingSlot, editName.trim());
      if (usePresetStore.getState().activePreset.slot === editingSlot) {
        updateActivePresetName(editName.trim());
      }
      // Persiste su Firestore + localStorage
      savePresetName(editingSlot, editName.trim());
      setEditingSlot(null);
      toast({
        title: 'Nome salvato',
        description: user
          ? `"${editName.trim()}" sincronizzato su cloud.`
          : `"${editName.trim()}" salvato localmente. Accedi per sincronizzarlo su cloud.`,
      });
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-5 py-1 md:space-y-7 md:py-2">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="section-kicker mb-1">Preset manager</p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Libreria preset</h2>
            <p className="mt-1 text-sm text-muted-foreground">Trova rapidamente il suono giusto e invialo alla pedaliera.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {/* Indicatore stato cloud */}
            <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
              {namesLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : user ? (
                <Cloud className="w-3 h-3 text-green-500" />
              ) : (
                <CloudOff className="w-3 h-3 text-amber-500" />
              )}
              <span>{user ? 'Cloud sync attivo' : 'Solo locale — accedi per sync cloud'}</span>
            </div>
            <Button
              onClick={() => syncPresets()}
              variant={isSyncing ? 'secondary' : 'outline'}
              className="touch-target gap-2"
              disabled={isSyncing || status !== 'connected'}
              title={status === 'connected' ? undefined : 'Collega la pedaliera per sincronizzare'}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Hardware
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="touch-target gap-2">
                  <HardDriveDownload className="w-4 h-4" /> Backup
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Esporta preset (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Importa preset…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} aria-label="File di preset da importare" />
            <Button className="touch-target gap-2">
              <Plus className="w-4 h-4" /> Nuovo
            </Button>
          </div>
        </header>

        {isSyncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Sincronizzazione slot...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        <div className="app-surface flex flex-col items-center justify-between gap-3 rounded-2xl p-3 md:flex-row">
          <div className="relative w-full md:w-[min(28rem,50vw)]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca tra i preset..."
              className="h-11 border-border bg-background/50 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isBulkMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                if (!isBulkMode) clearSelection();
              }}
              className="h-10 text-xs font-bold uppercase"
            >
              {isBulkMode ? <X className="w-4 h-4 mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
              {isBulkMode ? 'Chiudi Selezione' : 'Selezione Multipla'}
            </Button>
            <div className="flex rounded-md border border-border p-1 bg-background/40">
              <Button aria-label="Vista griglia" variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="touch-target h-10 w-10" onClick={() => setView('grid')}>
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button aria-label="Vista elenco" variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="touch-target h-10 w-10" onClick={() => setView('list')}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isBulkMode && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold">
                    {selectedSlots.size} preset selezionati
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                      Seleziona Tutti
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs">
                      Cancella Selezione
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs font-bold uppercase mb-2 block">Volume MIN</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[bulkVolumeMin]}
                          onValueChange={(v) => setBulkVolumeMin(v[0])}
                          min={0}
                          max={50}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono w-8 text-right">{bulkVolumeMin}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs font-bold uppercase mb-2 block">Volume MAX</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[bulkVolumeMax]}
                          onValueChange={(v) => setBulkVolumeMax(v[0])}
                          min={51}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono w-8 text-right">{bulkVolumeMax}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={applyBulkVolume}
                    disabled={selectedSlots.size === 0}
                    className="w-full md:w-auto"
                  >
                    Applica Volume a {selectedSlots.size} Preset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredPresets.length === 0 ? (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center opacity-60">
            <h3 className="text-xl font-bold">Nessun Preset trovato</h3>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
            {filteredPresets.map((preset, index) => {
              const displayName = getDisplayName(preset);
              const hasCustomName = !!savedNames[preset.slot];
              const isSelected = selectedSlots.has(preset.slot);
              return (
                <Card
                  key={preset.slot}
                  className={`app-surface group relative cursor-pointer overflow-hidden rounded-2xl transition-colors hover:border-primary/60 ${isSelected ? 'border-primary bg-primary/10' : ''}`}
                  onClick={() => handleSelectPreset(preset)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {isBulkMode && (
                    <div className="absolute top-3 left-3 z-10">
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border bg-background/50 hover:border-primary/60'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(preset.slot);
                        }}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-label border-primary/20 text-primary bg-primary/5">
                        {formatSlotLabel(preset.slot)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-label="Altre azioni" variant="ghost" size="icon" className="touch-target h-10 w-10" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleConfigurePreset(e as any, preset)}>Modifica</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => startEditingName(e as any, preset)}>Rinomina</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {editingSlot === preset.slot ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveName(e as any); }}
                          placeholder="Nome preset..."
                          className="h-8"
                          autoFocus
                        />
                        <Button size="icon" className="h-8 w-8 shrink-0" onClick={saveName}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle
                        className={`text-lg mt-2 truncate font-bold ${!hasCustomName ? 'text-muted-foreground/80 font-mono text-base' : ''}`}
                        title={hasCustomName ? displayName : 'Clicca ⋮ → Rinomina per aggiungere un nome'}
                      >
                        {displayName}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-label text-muted-foreground uppercase font-bold tracking-wider">Amplificatore</div>
                      <div className="text-sm font-medium">{preset.ampModel}</div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-border/30 bg-secondary/10 pt-2">
                    <span className="text-label text-muted-foreground font-mono">PC: {preset.slot - 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-label font-bold uppercase tracking-widest hover:text-primary gap-1"
                      onClick={(e) => handleConfigurePreset(e, preset)}
                    >
                      <Settings2 className="w-3 h-3" /> Configura
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border bg-card/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr className="text-left">
                    {isBulkMode && (
                      <th className="p-4 font-bold uppercase text-caption w-12 text-center">
                        <div
                          className="w-5 h-5 mx-auto cursor-pointer"
                          onClick={() => selectedSlots.size === filteredPresets.length ? clearSelection() : selectAll()}
                        >
                          {selectedSlots.size === filteredPresets.length ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </th>
                    )}
                    <th className="p-4 font-bold uppercase text-caption w-20 text-center">Slot</th>
                    <th className="p-4 font-bold uppercase text-caption">Nome</th>
                    <th className="p-4 font-bold uppercase text-caption">Amp</th>
                    <th className="p-4 font-bold uppercase text-caption text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredPresets.map((preset) => {
                    const displayName = getDisplayName(preset);
                    const hasCustomName = !!savedNames[preset.slot];
                    const isSelected = selectedSlots.has(preset.slot);
                    return (
                      <tr
                        key={preset.slot}
                        className={`hover:bg-primary/5 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                        onClick={() => handleSelectPreset(preset)}
                      >
                        {isBulkMode && (
                          <td className="p-4 text-center">
                            <div
                              className={`w-5 h-5 mx-auto rounded border-2 flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-border bg-background/50 hover:border-primary/60'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(preset.slot);
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-mono font-bold text-primary text-center">{formatSlotLabel(preset.slot)}</td>
                        <td className="p-4">
                          {editingSlot === preset.slot ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveName(e as any); }}
                                placeholder="Nome preset..."
                                className="h-8 w-48"
                                autoFocus
                              />
                              <Button size="icon" className="h-8 w-8 shrink-0" onClick={saveName}>
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className={`font-semibold ${!hasCustomName ? 'text-muted-foreground/80 font-mono text-xs' : ''}`}>
                              {displayName}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-label bg-secondary/50">{preset.ampModel}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase gap-1"
                              onClick={(e) => { e.stopPropagation(); startEditingName(e, preset); }}
                            >
                              Rinomina
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase gap-1"
                              onClick={(e) => handleConfigurePreset(e, preset)}
                            >
                              <Settings2 className="w-3 h-3" /> Modifica
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <AlertDialog open={!!pendingImport} onOpenChange={(open) => { if (!open && !isImporting) setPendingImport(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importare {pendingImport?.presets.length} preset?</AlertDialogTitle>
            <AlertDialogDescription>
              Dal file {pendingImport?.fileName}. {pendingImport && pendingImport.presets.length > 16 ? `Verranno sovrascritti ${pendingImport.presets.length} slot.` : `Verranno sovrascritti questi slot: ${pendingImport?.presets.map(p => p.slot).join(', ')}.`}
              {pendingImport && pendingImport.skipped > 0 ? ` ${pendingImport.skipped} preset non validi verranno ignorati.` : ''} Nulla viene inviato alla pedaliera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmImport(); }} disabled={isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Importa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
