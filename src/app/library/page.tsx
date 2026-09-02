
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, RefreshCw, Loader2, Check, MoreVertical, LayoutGrid, List, Settings2, CloudOff, Cloud } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';
import { usePresetNames } from '@/hooks/use-preset-names';
import { useUser } from '@/firebase';
import { Preset } from '@/types/preset';

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

export default function LibraryPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const { sendProgramChange, status, devicePresets, syncPresets, isSyncing, syncProgress, updatePresetName } = useMidiStore();
  const { setActivePreset } = usePresetStore();
  const { toast } = useToast();
  const { user } = useUser();

  // Nomi salvati su Firestore (o localStorage se non loggato)
  const { savedNames, savePresetName, isLoading: namesLoading } = usePresetNames();

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

  const handleSelectPreset = (preset: Preset) => {
    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }
    setActivePreset({ ...preset, name: getDisplayName(preset) });
    toast({
      title: 'Preset Attivato',
      description: `Slot ${formatSlotLabel(preset.slot)}: ${getDisplayName(preset)} selezionato sull'hardware.`,
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
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 py-1 md:space-y-7 md:py-2">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="section-kicker mb-1">Preset manager</p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Libreria preset</h2>
            <p className="mt-1 text-sm text-muted-foreground">Trova rapidamente il suono giusto e invialo alla pedaliera.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {/* Indicatore stato cloud */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Hardware
            </Button>
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

        {filteredPresets.length === 0 ? (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center opacity-60">
            <h3 className="text-xl font-bold">Nessun Preset trovato</h3>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
            {filteredPresets.map((preset, index) => {
              const displayName = getDisplayName(preset);
              const hasCustomName = !!savedNames[preset.slot];
              return (
                <Card
                  key={preset.slot}
                  className="app-surface group relative cursor-pointer overflow-hidden rounded-2xl transition-colors hover:border-primary/60"
                  onClick={() => handleSelectPreset(preset)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
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
                        className={`text-lg mt-2 truncate font-bold ${!hasCustomName ? 'text-muted-foreground/60 font-mono text-base' : ''}`}
                        title={hasCustomName ? displayName : 'Clicca ⋮ → Rinomina per aggiungere un nome'}
                      >
                        {displayName}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Amplificatore</div>
                      <div className="text-sm font-medium">{preset.ampModel}</div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-border/30 bg-secondary/10 pt-2">
                    <span className="text-[10px] text-muted-foreground font-mono">PC: {preset.slot - 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] font-bold uppercase tracking-widest hover:text-primary gap-1"
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
                    <th className="p-4 font-bold uppercase text-[11px] w-20 text-center">Slot</th>
                    <th className="p-4 font-bold uppercase text-[11px]">Nome</th>
                    <th className="p-4 font-bold uppercase text-[11px]">Amp</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredPresets.map((preset) => {
                    const displayName = getDisplayName(preset);
                    const hasCustomName = !!savedNames[preset.slot];
                    return (
                      <tr
                        key={preset.slot}
                        className="hover:bg-primary/5 transition-colors group cursor-pointer"
                        onClick={() => handleSelectPreset(preset)}
                      >
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
                            <span className={`font-semibold ${!hasCustomName ? 'text-muted-foreground/60 font-mono text-xs' : ''}`}>
                              {displayName}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px] bg-secondary/50">{preset.ampModel}</Badge>
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
    </AppShell>
  );
}
