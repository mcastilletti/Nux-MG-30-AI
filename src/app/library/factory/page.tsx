'use client';

import React, { useMemo, useState } from 'react';
import { Factory, ListMusic, Loader2, Send, Sparkles, Star } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { FACTORY_PRESETS, factoryPresetToPreset, type FactoryPreset } from '@/lib/factory-presets';
import { GENRES, type Genre } from '@/lib/genres';
import { formatSlotLabel } from '@/lib/slot';
import { songsForFactoryCard, songsWithoutGenre } from '@/lib/factory-suggestions';
import { useEstimateSongGenres } from '@/hooks/use-song-genres';
import { useNotesCache } from '@/stores/use-notes-cache';
import { PageHeader } from '@/components/common/page-header';

const ALL = 'all';
const ALT_ROCK = 'alt-rock';

export default function FactoryPresetsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<Genre | typeof ALL | typeof ALT_ROCK>(ALL);
  const [toSend, setToSend] = useState<FactoryPreset | null>(null);
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

  const altRockCount = useMemo(() => FACTORY_PRESETS.filter((p) => p.card.altRock).length, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FACTORY_PRESETS.filter((p) => {
      const { card } = p;
      if (genre === ALT_ROCK && !card.altRock) return false;
      if (genre !== ALL && genre !== ALT_ROCK && !card.genres.includes(genre)) return false;
      if (!q) return true;
      return [p.name, formatSlotLabel(p.slot), String(p.slot), card.soundType, card.notes, ...card.bands].some((t) => t.toLowerCase().includes(q));
    });
  }, [search, genre]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 py-1 md:space-y-7 md:py-2">
      <div className="space-y-4">
        <PageHeader kicker="Preset manager" title="Preset di fabbrica" description="I 128 preset originali della MG-30, con numero e nome di fabbrica. Ognuno ha la sua scheda con tipo di suono, generi e band di esempio. Puoi inserirne uno in qualsiasi slot." />
        <LibraryTabs />
      </div>

      <Card className="app-surface rounded-2xl">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-primary" aria-hidden="true" /> {altRockCount} preset adatti a Oasis e all&apos;alternative rock anni 90–2000</div>
            <p className="text-caption text-muted-foreground">Contrassegnati con una stella: crunch britannici, puliti Vox, fuzz e lead da rock alternativo. Filtrali con il menu dei generi.</p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => setGenre(ALT_ROCK)}>
            <Star className="h-4 w-4" /> Mostra solo questi
          </Button>
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
        <Input placeholder="Cerca per nome, numero, band o descrizione…" className="h-11 min-h-11 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cerca tra i preset di fabbrica" />
        <Select value={genre} onValueChange={(v) => setGenre(v as Genre | typeof ALL | typeof ALT_ROCK)}>
          <SelectTrigger className="h-11 sm:w-72" aria-label="Filtra per genere"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i generi</SelectItem>
            <SelectItem value={ALT_ROCK}>★ Oasis e alt rock 90–2000</SelectItem>
            {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Factory className="h-8 w-8" />} title="Nessun preset trovato" description="Cambia la ricerca o il genere." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
          {visible.map((preset) => {
            const { card } = preset;
            const fit = songsForFactoryCard(card, songs);
            return (
              <Card key={preset.slot} className="app-surface flex flex-col rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-label text-primary">{formatSlotLabel(preset.slot)}</Badge>
                    <span className="text-caption text-muted-foreground">N. {preset.slot}</span>
                    {card.altRock && <Star className="h-4 w-4 fill-primary text-primary" aria-label="Adatto a Oasis e alt rock 90–2000" />}
                    <Badge variant="secondary" className="ml-auto text-label">{card.soundType}</Badge>
                  </div>
                  <CardTitle className="mt-2 truncate text-lg font-bold" title={preset.name}>{preset.name}</CardTitle>
                  {preset.userIR && <p className="truncate text-caption text-muted-foreground">IR {preset.userIR}</p>}
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pb-4 text-sm">
                  <PresetSummary effects={preset.effects} />
                  <div className="flex flex-wrap gap-1">
                    {card.genres.map((g) => <Badge key={g} variant="outline" className="text-label">{g}</Badge>)}
                  </div>
                  <p className="text-muted-foreground">{card.notes}</p>
                  <p className="text-caption"><span className="font-bold uppercase tracking-wider text-muted-foreground">Suona come: </span>{card.bands.join(', ')}</p>
                  {fit.length > 0 && (
                    <p className="text-caption">
                      <span className="font-bold uppercase tracking-wider text-muted-foreground">Brani adatti: </span>
                      {fit.slice(0, 3).map((s) => s.title).join(', ')}{fit.length > 3 ? ` e altri ${fit.length - 3}` : ''}
                    </p>
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
