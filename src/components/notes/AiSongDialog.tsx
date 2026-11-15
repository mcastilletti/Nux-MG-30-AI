'use client';

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { generateSongFromPrompt } from '@/ai/flows/song-from-prompt';
import { aiFailureText } from '@/ai/ai-error';
import { aiSongToNote, type AiSongData } from '@/lib/ai-song';
import { buildInstrumentationContext, resolveAmplifier, resolveGuitar } from '@/lib/instrumentation-context';
import { useInstrumentationStore } from '@/stores/use-instrumentation-store';

const EXAMPLES = ['Wonderwall degli Oasis', 'Smells Like Teen Spirit, versione con suono sporco', 'Un giro blues lento in La con un assolo'];

/**
 * "Aggiungi con AI": dalla richiesta in testo l'AI propone un brano (struttura, accordi, note) e il suono
 * per la pedaliera. Si vede l'anteprima e si decide se crearlo; `onCreate` salva brano e, se richiesto, suono.
 */
export function AiSongDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: AiSongData, options: { saveTone: boolean }) => Promise<void>;
}) {
  const { toast } = useToast();
  const { user } = useUser();
  const [request, setRequest] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [proposal, setProposal] = React.useState<AiSongData | null>(null);
  const [saveTone, setSaveTone] = React.useState(true);
  const { guitars, amplifiers, selectedGuitarId, selectedAmplifierId } = useInstrumentationStore(useShallow((s) => ({
    guitars: s.guitars, amplifiers: s.amplifiers, selectedGuitarId: s.selectedGuitarId, selectedAmplifierId: s.selectedAmplifierId,
  })));

  const reset = () => { setRequest(''); setError(''); setProposal(null); setSaveTone(true); setBusy(false); };

  const generate = async () => {
    const text = request.trim();
    if (!text) return;
    if (!user) { setError('Accedi con Google dal menu laterale per usare l\'AI.'); return; }
    setBusy(true);
    setError('');
    try {
      const instrumentation = buildInstrumentationContext(resolveGuitar(guitars, selectedGuitarId), resolveAmplifier(amplifiers, selectedAmplifierId));
      const result = await generateSongFromPrompt({ request: text, instrumentation }, await user.getIdToken());
      if (!result.ok) { setError(aiFailureText(result)); return; }
      setProposal(result.data);
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'Generazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!proposal) return;
    setBusy(true);
    try {
      await onCreate(proposal, { saveTone });
      onOpenChange(false);
      reset();
    } catch (e: unknown) {
      toast({ title: 'Brano non creato', description: e instanceof Error ? e.message : 'Riprova.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const preview = proposal ? aiSongToNote(proposal, { idSeed: 0 }) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" aria-hidden="true" /> Aggiungi con AI</DialogTitle>
          <DialogDescription>
            {proposal
              ? 'Controlla la proposta: accordi e struttura sono una trascrizione sintetica da verificare ascoltando il brano.'
              : 'Descrivi il brano che vuoi suonare: l\'AI propone struttura, accordi e il suono per la tua pedaliera. Puoi modificare tutto dopo.'}
          </DialogDescription>
        </DialogHeader>

        {!proposal || !preview ? (
          <div className="space-y-3">
            <Textarea
              value={request}
              onChange={(e) => { setRequest(e.target.value); setError(''); }}
              placeholder="Es.: Wonderwall degli Oasis"
              maxLength={1000}
              className="min-h-[110px] resize-y bg-background/50"
              aria-label="Richiesta per l'AI"
              disabled={busy}
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => setRequest(example)} disabled={busy}
                  className="min-h-9 rounded-full border border-border px-3 text-caption text-muted-foreground hover:border-primary/50 hover:text-foreground">
                  {example}
                </button>
              ))}
            </div>
            <p className="text-caption text-muted-foreground">Il suono tiene conto della chitarra e dell&apos;ampli scelti in Strumentazione.</p>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="break-words text-lg font-bold uppercase leading-tight">{preview.title}</h3>
              {preview.genre && <Badge variant="outline" className="text-label">{preview.genre}</Badge>}
            </div>
            {preview.generalNotes && <p className="whitespace-pre-wrap text-body-sm text-muted-foreground">{proposal.generalNotes}</p>}
            <ul className="space-y-2">
              {preview.sections.map((section) => (
                <li key={section.id} className="rounded-lg border border-border bg-card/50 p-2.5">
                  <p className="text-label font-bold uppercase text-primary">{section.type}</p>
                  <p className="font-mono text-body-sm">{(section.chords ?? []).map((c) => (c === 'NEWLINE' ? '·' : c)).join(' ') || '—'}</p>
                  {section.text && <p className="text-caption text-muted-foreground">{section.text}</p>}
                </li>
              ))}
            </ul>
            {preview.droppedChords > 0 && <p className="text-caption text-muted-foreground">{preview.droppedChords} accordi in una forma non riconosciuta sono stati scartati.</p>}
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-label font-bold uppercase text-primary">Suono proposto · {proposal.tone.name}</p>
              <p className="text-body-sm text-muted-foreground">{proposal.tone.explanation}</p>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm">
                <Checkbox checked={saveTone} onCheckedChange={(v) => setSaveTone(v === true)} aria-label="Salva il suono nell'Archivio suoni" />
                Salva il suono nell&apos;Archivio suoni
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          {proposal ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => { setProposal(null); setError(''); }}>Cambia richiesta</Button>
              <Button disabled={busy} onClick={create} className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Crea brano
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annulla</Button>
              <Button onClick={generate} disabled={!request.trim() || busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} Genera
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
