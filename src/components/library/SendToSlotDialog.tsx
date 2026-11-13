'use client';

import * as React from 'react';
import { AlertTriangle, Archive, Loader2, Send, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetNames } from '@/hooks/use-preset-names';
import { useWriteToSlot, type WriteToSlotResult } from '@/hooks/use-write-to-slot';
import { useToast } from '@/hooks/use-toast';
import { isPlaceholderPreset } from '@/lib/slot-content';
import { formatSlotLabel } from '@/lib/slot';
import type { Preset } from '@/types/preset';

type Step = 'pick' | 'replace' | 'confirm-delete';

/**
 * Invio di un suono (preset di fabbrica, suono dell'archivio, preset della libreria) in uno slot.
 * Prima di sovrascrivere chiede cosa fare del suono che c'è: archiviarlo o eliminarlo, e in quel
 * caso avvisa che verrà perso.
 */
export function SendToSlotDialog({ open, onOpenChange, preset, sourceLabel, defaultSlot, excludeSlot }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suono da scrivere (lo slot viene sostituito con quello scelto). */
  preset: Preset | null;
  /** Descrizione del suono, es. "Preset di fabbrica 01A · CT-RectoBeast". */
  sourceLabel: string;
  defaultSlot?: number;
  /** Slot da non proporre (es. lo slot stesso del preset di libreria che si sta copiando). */
  excludeSlot?: number;
}) {
  const devicePresets = useMidiStore((s) => s.devicePresets);
  const midiStatus = useMidiStore((s) => s.status);
  const { savedNames, savePresetName } = usePresetNames();
  const writeToSlot = useWriteToSlot(savePresetName);
  const { toast } = useToast();
  const [slot, setSlot] = React.useState<number>(defaultSlot ?? 1);
  const [step, setStep] = React.useState<Step>('pick');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep('pick');
      setSlot(defaultSlot && defaultSlot !== excludeSlot ? defaultSlot : excludeSlot === 1 ? 2 : 1);
    }
  }, [open, defaultSlot, excludeSlot]);

  const current = devicePresets.find((p) => p.slot === slot);
  const currentName = savedNames[slot] || current?.name || formatSlotLabel(slot);
  const unknownContent = current ? isPlaceholderPreset(current, savedNames[slot]) : true;
  const slotText = `${formatSlotLabel(slot)} · ${currentName}`;

  const report = (result: WriteToSlotResult, archived: boolean) => {
    const where = { cloud: 'Salvato nel tuo account.', queued: 'Salvato: verrà sincronizzato appena torni online.', local: 'Salvato su questo dispositivo.', 'local-error': 'Salvato solo su questo dispositivo: il salvataggio nel tuo account non è riuscito.' }[result.saved];
    const pedal = {
      sent: 'Invio alla MG-30 in corso (scena 1): attendi la fine prima di cambiare preset.',
      offline: 'La pedaliera non è collegata: il suono è nella libreria, invialo dall\'editor quando la colleghi.',
      busy: 'Invio alla pedaliera non eseguito: sincronizzazione già in corso. Apri il preset nell\'editor e premi Salva.',
    }[result.pedal];
    const archivedText = archived
      ? result.archived === 'local-error' ? ' Il suono precedente è nell\'Archivio solo su questo dispositivo.' : ' Il suono precedente è nell\'Archivio suoni.'
      : '';
    toast({
      title: `${preset?.name} in ${formatSlotLabel(slot)}`,
      description: `${where}${archivedText} ${pedal}`,
      variant: result.saved === 'local-error' || result.pedal === 'busy' ? 'destructive' : undefined,
    });
  };

  const run = async (archiveCurrent: boolean) => {
    if (!preset) return;
    setBusy(true);
    try {
      const result = await writeToSlot({ preset, slot, archiveCurrent, currentName });
      report(result, archiveCurrent);
      onOpenChange(false);
    } catch {
      toast({ title: 'Operazione non riuscita', description: 'Lo slot non è stato modificato. Riprova.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {step === 'pick' && (
          <>
            <DialogHeader>
              <DialogTitle>Inserisci in uno slot</DialogTitle>
              <DialogDescription>{sourceLabel}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="send-to-slot-target">Slot di destinazione</Label>
              <Select value={String(slot)} onValueChange={(v) => setSlot(Number(v))}>
                <SelectTrigger id="send-to-slot-target" className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {devicePresets.filter((p) => p.slot !== excludeSlot).map((p) => (
                    <SelectItem key={p.slot} value={String(p.slot)}>
                      {formatSlotLabel(p.slot)} · {savedNames[p.slot] || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-caption text-muted-foreground">
                {midiStatus === 'connected'
                  ? 'Il suono verrà scritto sulla pedaliera in questo slot.'
                  : 'Pedaliera non collegata: il suono verrà salvato nella libreria dell\'app.'}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button className="min-h-11 gap-2" onClick={() => setStep('replace')}><Send className="h-4 w-4" /> Avanti</Button>
            </DialogFooter>
          </>
        )}

        {step === 'replace' && (
          <>
            <DialogHeader>
              <DialogTitle>Cosa fai del suono in {formatSlotLabel(slot)}?</DialogTitle>
              <DialogDescription>
                Nello slot c&apos;è <strong className="text-foreground">{currentName}</strong>. Prima di sostituirlo puoi metterlo nell&apos;Archivio suoni, per riusarlo quando vuoi.
              </DialogDescription>
            </DialogHeader>
            {unknownContent && (
              <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-caption">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                L&apos;app non ha ancora letto questo slot dalla pedaliera: nell&apos;archivio finirebbe il preset di partenza dell&apos;app, non il suono reale. Per salvarlo davvero, aprilo nell&apos;editor con la pedaliera collegata e usa &quot;Leggi il preset dalla pedaliera&quot;.
              </p>
            )}
            <div className="grid gap-2">
              <Button className="min-h-11 justify-start gap-2" disabled={busy} onClick={() => run(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Archivia {currentName} e sostituisci
              </Button>
              <Button variant="outline" className="min-h-11 justify-start gap-2 border-destructive/60 hover:bg-destructive/10" disabled={busy} onClick={() => setStep('confirm-delete')}>
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" /> Sostituisci senza archiviare
              </Button>
              <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => setStep('pick')}>Indietro</Button>
            </div>
          </>
        )}

        {step === 'confirm-delete' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" /> Il suono verrà perso</DialogTitle>
              <DialogDescription>
                <strong className="text-foreground">{slotText}</strong> verrà sostituito da {preset?.name} e non sarà più recuperabile, né dall&apos;app né dalla pedaliera. Se non sei sicuro, torna indietro e archivialo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setStep('replace')}>Indietro</Button>
              <Button variant="destructive" className="min-h-11 gap-2" disabled={busy} onClick={() => run(false)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Elimina e sostituisci
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
