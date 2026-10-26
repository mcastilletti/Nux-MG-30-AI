'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateMG30Preset, MG30PresetOutput } from '@/ai/flows/mg30-preset-gen';
import { formatValue, normalizePresetSuggestion, PresetNormalizationResult } from '@/lib/mg30-preset-normalizer';
import { applyJsonToPreset, parseDirectJsonInput } from '@/lib/preset-json';
import { useInstrumentationStore } from '@/stores/use-instrumentation-store';
import { buildInstrumentationContext, resolveAmplifier, resolveGuitar } from '@/lib/instrumentation-context';
import type { Preset } from '@/types/preset';

/** AI Mode: genera un preset con l'AI o applica un JSON incollato. */
export function AiModeDialog({ open, onOpenChange, activePreset, setActivePreset }: {
  /** Aperto dall'intestazione: pulsante su desktop, menu ⋮ su mobile. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePreset: Preset;
  setActivePreset: (preset: Preset) => void;
}) {
  const { toast } = useToast();
  const setIsAiModalOpen = onOpenChange;
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposedPreset, setProposedPreset] = useState<MG30PresetOutput | null>(null);
  const [proposedNormalization, setProposedNormalization] = useState<PresetNormalizationResult | null>(null);
  const { guitars, amplifiers, selectedGuitarId, selectedAmplifierId, selectGuitar, selectAmplifier } = useInstrumentationStore();
  const selectedGuitar = resolveGuitar(guitars, selectedGuitarId);
  const selectedAmplifier = resolveAmplifier(amplifiers, selectedAmplifierId);

  const handleAiModeGenerate = async () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt) return;

    // Un JSON, anche dentro un blocco markdown, è sempre un comando diretto e non passa dall'AI.
    const directJson = parseDirectJsonInput(trimmedPrompt);
    if (directJson.looksLikeJson) {
      if (directJson.error) {
        toast({
          title: "Errore nel JSON",
          description: "La configurazione diretta non è valida: " + directJson.error,
          variant: "destructive"
        });
        return;
      }

      try {
        const parsedJson = directJson.parsed;
        // Applica i parametri JSON al preset attivo
        const { updatedPreset, appliedCount, warnings } = applyJsonToPreset(activePreset, parsedJson);

        if (appliedCount > 0) {
          setActivePreset(updatedPreset);
          toast({
            title: "Parametri JSON Applicati",
            description: `${appliedCount} modifiche applicate${warnings.length ? `, ${warnings.length} valori corretti.` : '.'} Clicca SAVE per sincronizzare la pedaliera.`,
          });
          setIsAiModalOpen(false);
          setAiPrompt('');
          return;
        } else {
          toast({
            title: "JSON Valido ma Nessun Parametro Corrispondente",
            description: "Il JSON è valido ma non contiene parametri o moduli validi per MG-30.",
            variant: "destructive"
          });
          return;
        }
      } catch (err: any) {
        toast({
          title: "Errore nel JSON",
          description: "La stringa inserita inizia come un JSON ma contiene errori di sintassi: " + err.message,
          variant: "destructive"
        });
        return;
      }
    }

    // Altrimenti, procedi con la generazione tramite Intelligenza Artificiale
    setIsGenerating(true);
    setProposedPreset(null);
    setProposedNormalization(null);
    try {
      const instrumentation = buildInstrumentationContext(selectedGuitar, selectedAmplifier);
      const result = await generateMG30Preset({ description: aiPrompt, instrumentation });
      setProposedPreset(result);
      setProposedNormalization(normalizePresetSuggestion(activePreset, result));
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
    if (!proposedPreset || !proposedNormalization) return;

    const newPreset = proposedNormalization.updatedPreset;

    setActivePreset(newPreset);

    toast({
      title: "AI Tone Applied",
      description: `Il preset '${proposedPreset.name}' è pronto. Clicca SAVE per sincronizzare la pedaliera.`
    });

    setProposedPreset(null);
    setProposedNormalization(null);
    setIsAiModalOpen(false);
    setAiPrompt('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {!proposedPreset ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Tone Designer</DialogTitle>
              <DialogDescription>Per l’AI descrivi genericamente band, brano, periodo e tipo di chitarra. Se incolli un JSON, verrà applicato direttamente senza interpretazione AI.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Chitarra</p>
                  <Select value={selectedGuitar?.id ?? 'none'} onValueChange={(value) => selectGuitar(value === 'none' ? undefined : value)}>
                    <SelectTrigger className="bg-background/60"><SelectValue placeholder="Predefinita (Epiphone ES-335)" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Predefinita (Epiphone ES-335)</SelectItem>{guitars.map(guitar => <SelectItem key={guitar.id} value={guitar.id}>{guitar.model}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Amplificatore</p>
                  <Select value={selectedAmplifier?.id ?? 'none'} onValueChange={(value) => selectAmplifier(value === 'none' ? undefined : value)}>
                    <SelectTrigger className="bg-background/60"><SelectValue placeholder="Predefinito (Headrush FRFR-112)" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Predefinito (Headrush FRFR-112)</SelectItem>{amplifiers.map(amplifier => <SelectItem key={amplifier.id} value={amplifier.id}>{amplifier.model}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="text-caption text-muted-foreground sm:col-span-2">La selezione viene applicata automaticamente a ogni nuova generazione AI.</p>
              </div>
              <Textarea
                placeholder={`Es. per prompt AI: Suono grosso in stile Oasis, chitarra humbucker, ritmica anni '90, medi presenti e ambiente contenuto...
    Es. per JSON: { "amp": { "gain": 60, "master": 80 }, "delay": { "enabled": true } }`}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[150px] bg-secondary/20 font-mono text-sm"
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
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="section-kicker mb-2">Modifiche rilevate</p>
                {proposedNormalization?.changes.length ? (
                  <div className="max-h-44 space-y-1.5 overflow-y-auto">
                    {proposedNormalization.changes.map((change, index) => (
                      <div key={`${change.type}-${change.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground"><span className="font-semibold uppercase text-foreground">{change.type}</span> · {change.label}</span>
                        <span className="shrink-0 font-mono text-primary">{formatValue(change.from)} → {formatValue(change.to)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nessuna modifica applicabile trovata.</p>
                )}
              </div>
              {!!proposedNormalization?.warnings.length && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <p className="mb-1 font-semibold">Avvisi di validazione</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {proposedNormalization.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => { setProposedPreset(null); setProposedNormalization(null); }}>Scarta</Button>
              <Button onClick={applyProposedPreset} disabled={!proposedNormalization?.changes.length} className="flex-1">Applica all'Editor</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
