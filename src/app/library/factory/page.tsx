'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Factory, ListMusic, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { LibraryTabs } from '@/components/library/LibraryTabs';
import { PresetSummary } from '@/components/library/PresetSummary';
import { SendToSlotDialog } from '@/components/library/SendToSlotDialog';
import { useFactoryNotes } from '@/hooks/use-factory-notes';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { describeFactoryPresets } from '@/ai/flows/factory-preset-notes';
import { AiClientError, isDailyQuota } from '@/ai/ai-error';
import { FACTORY_PRESETS, factoryPresetToPreset, type FactoryPreset } from '@/lib/factory-presets';
import { factoryNoteId, parseFactoryNote, pendingFactoryBatches, type FactoryPresetNote } from '@/lib/factory-notes';
import { GENRES, type Genre } from '@/lib/genres';
import { formatSlotLabel } from '@/lib/slot';
import { songsForFactoryNote, songsWithoutGenre } from '@/lib/factory-suggestions';
import { useEstimateSongGenres } from '@/hooks/use-song-genres';
import { useNotesCache } from '@/stores/use-notes-cache';

import { PageHeader } from '@/components/common/page-header';
const ALL = 'all';
/** Il servizio AI gratuito ammette poche richieste al minuto: pausa tra i lotti e nuovi tentativi se serve. */
const PAUSE_BETWEEN_BATCHES_MS = 6000;
const RETRY_WAIT_MS = 30000;
const MAX_RETRIES = 2;
const ALL_SLOTS = FACTORY_PRESETS.map((p) => p.slot);

export default function FactoryPresetsPage() {
  const { notesBySlot, hydrated, saveMany } = useFactoryNotes();
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<Genre | typeof ALL>(ALL);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [toSend, setToSend] = useState<FactoryPreset | null>(null);
  const stopRef = useRef(false);
  const [waitNote, setWaitNote] = useState<string | null>(null);
  const songs = useNotesCache((s) => s.notes);
  const estimateGenres = useEstimateSongGenres();
  const [genreProgress, setGenreProgress] = useState<{ done: number; total: number } | null>(null);
  const missingGenre = useMemo(() => songsWithoutGenre(songs), [songs]);

  const estimateMissingGenres = async () => {
    if (!user) {
      toast({ title: 'Accedi per usare l\'AI', description: 'Il genere dei brani viene stimato dall\'AI dell\'app: accedi con Google dal menu laterale.', variant: 'destructive' });
      return;
    }
    setGenreProgress({ done: 0, total: missingGenre.length });
    try {
      const updated = await estimateGenres(missingGenre, (done, total) => setGenreProgress({ done, total }));
      toast({ title: 'Generi stimati', description: `${updated} brani aggiornati. Puoi correggerli aprendo il brano in modifica.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      const rateLimited = /429|limite|quota/i.test(message);
      toast({ title: rateLimited ? 'Limite AI raggiunto' : 'Stima interrotta', description: rateLimited ? 'Attendi un minuto e riprova: riparte dai brani ancora senza genere.' : message || 'Riprova più tardi.', variant: 'destructive' });
    } finally {
      setGenreProgress(null);
    }
  };

  const noteOf = (slot: number): FactoryPresetNote | undefined => notesBySlot[factoryNoteId(slot)];
  const doneCount = ALL_SLOTS.filter((s) => noteOf(s)).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FACTORY_PRESETS.filter((p) => {
      const note = notesBySlot[factoryNoteId(p.slot)];
      if (genre !== ALL && !note?.genres.includes(genre)) return false;
      if (!q) return true;
      return [p.name, formatSlotLabel(p.slot), String(p.slot), note?.soundType ?? '', note?.notes ?? ''].some((t) => t.toLowerCase().includes(q));
    });
  }, [search, genre, notesBySlot]);

  /** Pausa con conto alla rovescia visibile; si interrompe con "Interrompi". */
  const pause = async (ms: number, note: string) => {
    const end = Date.now() + ms;
    while (Date.now() < end && !stopRef.current) {
      setWaitNote(`${note} ${Math.ceil((end - Date.now()) / 1000)} s`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setWaitNote(null);
  };

  const generate = async (regenerateAll: boolean) => {
    if (!user) {
      toast({ title: 'Accedi per usare l\'AI', description: 'Le schede vengono scritte dall\'AI dell\'app: accedi con Google dal menu laterale.', variant: 'destructive' });
      return;
    }
    const done = regenerateAll ? new Set<number>() : new Set(ALL_SLOTS.filter((s) => noteOf(s)));
    const batches = pendingFactoryBatches(ALL_SLOTS, done);
    if (batches.length === 0) return;
    const total = batches.reduce((n, b) => n + b.length, 0);
    let written = 0;
    stopRef.current = false;
    setProgress({ done: 0, total });
    try {
      for (const [batchIndex, slots] of batches.entries()) {
        if (stopRef.current) break;
        // Il servizio AI accetta poche richieste al minuto: tra un lotto e l'altro si rallenta.
        if (batchIndex > 0) await pause(PAUSE_BETWEEN_BATCHES_MS, 'Pausa tra i lotti:');
        if (stopRef.current) break;
        let result = await describeFactoryPresets({ slots }, await user.getIdToken());
        // Limite al minuto: si aspetta e si riprova (non se la quota del giorno è finita).
        for (let attempt = 0; !result.ok && result.code === 'rate-limit' && !isDailyQuota(result) && attempt < MAX_RETRIES && !stopRef.current; attempt++) {
          await pause(RETRY_WAIT_MS, 'Limite AI: riprendo tra');
          if (stopRef.current) break;
          result = await describeFactoryPresets({ slots }, await user.getIdToken());
        }
        if (!result.ok) throw new AiClientError(result);
        const { notes } = result.data;
        const now = new Date().toISOString();
        const parsed = notes.map((n) => parseFactoryNote({ ...n, updatedAt: now })).filter((n): n is FactoryPresetNote => n !== null);
        const results = await saveMany(parsed);
        if (results.includes('local-error')) throw new Error('Salvataggio nel tuo account non riuscito.');
        written += parsed.length;
        setProgress({ done: written, total });
      }
      toast({ title: 'Schede pronte', description: `${written} preset di fabbrica descritti dall'AI.` });
    } catch (error: unknown) {
      const failure = error instanceof AiClientError ? error.failure : null;
      const message = error instanceof Error ? error.message : '';
      let reason: string;
      if (failure?.code === 'rate-limit') {
        reason = isDailyQuota(failure)
          ? `La quota giornaliera del servizio AI è finita: riprova domani, oppure attiva la fatturazione sul progetto della chiave. (${failure.detail})`
          : failure.detail
            ? `Il servizio AI ha rifiutato la richiesta per il limite al minuto, anche dopo aver aspettato. (${failure.detail})`
            : 'Hai superato le richieste al minuto consentite dall\'app: attendi un minuto.';
      } else {
        reason = message || 'Errore AI.';
      }
      toast({
        title: failure?.code === 'rate-limit' ? 'Limite AI raggiunto' : 'Generazione interrotta',
        description: `${written} schede salvate. ${reason} Riprova: riparte dagli slot mancanti.`,
        variant: 'destructive',
      });
    } finally {
      setWaitNote(null);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 py-1 md:space-y-7 md:py-2">
      <div className="space-y-4">
        <PageHeader kicker="Preset manager" title="Preset di fabbrica" description="I 128 preset originali della MG-30, con numero e nome di fabbrica. Puoi inserirne uno in qualsiasi slot." />
        <LibraryTabs />
      </div>

      <Card className="app-surface rounded-2xl">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Schede AI: {doneCount} su 128</div>
            <p className="text-caption text-muted-foreground">
              Tipo di suono, generi e note scritti dall&apos;AI a partire da modelli e parametri di ogni preset. Servono anche per i preset consigliati nei brani.
            </p>
            {progress && (
              <div className="space-y-1 pt-1" role="status" aria-live="polite">
                <Progress value={(progress.done / progress.total) * 100} className="h-2" />
                <div className="text-caption text-muted-foreground">{progress.done} di {progress.total} schede…</div>
                {waitNote && <div className="text-caption font-semibold text-warning">{waitNote}</div>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {progress ? (
              <Button variant="outline" className="min-h-11" onClick={() => { stopRef.current = true; }}>Interrompi dopo questo lotto</Button>
            ) : (
              <>
                {doneCount < 128 && (
                  <Button className="min-h-11 gap-2" onClick={() => generate(false)}>
                    <Sparkles className="h-4 w-4" /> {doneCount === 0 ? 'Genera le schede' : 'Completa le schede mancanti'}
                  </Button>
                )}
                {doneCount > 0 && (
                  <Button variant="outline" className="min-h-11" onClick={() => generate(true)}>Rigenera tutte</Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {missingGenre.length > 0 && (
        <Card className="app-surface rounded-2xl">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold"><ListMusic className="h-4 w-4 text-primary" aria-hidden="true" /> {missingGenre.length} brani senza genere</div>
              <p className="text-caption text-muted-foreground">Il genere dei brani decide quali preset di fabbrica sono adatti a ciascuno. L&apos;AI lo stima dal titolo; puoi correggerlo nel brano.</p>
              {genreProgress && (
                <div className="space-y-1 pt-1" role="status" aria-live="polite">
                  <Progress value={(genreProgress.done / Math.max(1, genreProgress.total)) * 100} className="h-2" />
                  <div className="text-caption text-muted-foreground">{genreProgress.done} di {genreProgress.total} brani…</div>
                </div>
              )}
            </div>
            <Button variant="outline" className="min-h-11 gap-2" disabled={!!genreProgress} onClick={estimateMissingGenres}>
              {genreProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Stima i generi con AI
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Cerca per nome, numero o descrizione…" className="h-11 min-h-11 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cerca tra i preset di fabbrica" />
        <Select value={genre} onValueChange={(v) => setGenre(v as Genre | typeof ALL)}>
          <SelectTrigger className="h-11 sm:w-64" aria-label="Filtra per genere"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i generi</SelectItem>
            {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!hydrated ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Caricamento…</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-8 w-8" />}
          title="Nessun preset trovato"
          description={genre !== ALL && doneCount === 0 ? 'I generi arrivano dalle schede AI: generale prima di filtrare.' : 'Cambia la ricerca o il genere.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
          {visible.map((preset) => {
            const note = notesBySlot[factoryNoteId(preset.slot)];
            return (
              <Card key={preset.slot} className="app-surface flex flex-col rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-label text-primary">{formatSlotLabel(preset.slot)}</Badge>
                    <span className="text-caption text-muted-foreground">N. {preset.slot}</span>
                    {note && <Badge variant="secondary" className="ml-auto text-label">{note.soundType}</Badge>}
                  </div>
                  <CardTitle className="mt-2 truncate text-lg font-bold" title={preset.name}>{preset.name}</CardTitle>
                  {preset.userIR && <p className="truncate text-caption text-muted-foreground">IR {preset.userIR}</p>}
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pb-4 text-sm">
                  <PresetSummary effects={preset.effects} />
                  {note ? (
                    <>
                      <div className="flex flex-wrap gap-1">
                        {note.genres.map((g) => <Badge key={g} variant="outline" className="text-label">{g}</Badge>)}
                      </div>
                      <p className="text-muted-foreground">{note.notes}</p>
                      {(() => {
                        const fit = songsForFactoryNote(note, songs);
                        if (fit.length === 0) return null;
                        return (
                          <p className="text-caption">
                            <span className="font-bold uppercase tracking-wider text-muted-foreground">Brani adatti: </span>
                            {fit.slice(0, 3).map((s) => s.title).join(', ')}{fit.length > 3 ? ` e altri ${fit.length - 3}` : ''}
                          </p>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="text-caption text-muted-foreground">Scheda non ancora generata.</p>
                  )}
                </CardContent>
                <CardFooter className="border-t border-border/30 pt-3">
                  <Button variant="outline" className="min-h-11 w-full gap-2" onClick={() => setToSend(preset)}>
                    <Send className="h-4 w-4" /> Inserisci in uno slot
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <SendToSlotDialog
        open={!!toSend}
        onOpenChange={(open) => { if (!open) setToSend(null); }}
        preset={toSend ? factoryPresetToPreset(toSend) : null}
        sourceLabel={toSend ? `Preset di fabbrica ${formatSlotLabel(toSend.slot)} (n. ${toSend.slot}) · ${toSend.name}` : ''}
        defaultSlot={toSend?.slot}
      />
    </div>
  );
}
