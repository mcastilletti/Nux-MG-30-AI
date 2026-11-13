'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, Factory, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SendToSlotDialog } from '@/components/library/SendToSlotDialog';
import { useFactoryNotes } from '@/hooks/use-factory-notes';
import { useEstimateSongGenres } from '@/hooks/use-song-genres';
import { useToast } from '@/hooks/use-toast';
import { FACTORY_PRESETS, factoryPresetToPreset, type FactoryPreset } from '@/lib/factory-presets';
import { factoryNoteId } from '@/lib/factory-notes';
import { suggestFactoryPresets } from '@/lib/factory-suggestions';
import { GENRES, isGenre } from '@/lib/genres';
import { formatSlotLabel } from '@/lib/slot';
import type { SavedNote } from '@/types/note';

const NO_GENRE = 'none';

/**
 * Genere del brano e preset di fabbrica consigliati (i primi 3 per quel genere, come nelle schede
 * della pagina Libreria → Fabbrica). Scegliere un consiglio apre "Inserisci in uno slot":
 * il brano non cambia e all'apertura non viene inviato nulla alla pedaliera.
 */
export function FactorySuggestions({ genre, editMode, onGenreChange, note }: {
  genre: string;
  editMode: boolean;
  /** In modifica il genere fa parte della bozza e si salva con la nota. */
  onGenreChange: (genre: string) => void;
  /** Brano salvato: in lettura la stima AI salva subito il genere su questo brano. */
  note?: SavedNote;
}) {
  const { notesBySlot } = useFactoryNotes();
  const estimate = useEstimateSongGenres();
  const { toast } = useToast();
  const [estimating, setEstimating] = React.useState(false);
  const [toSend, setToSend] = React.useState<FactoryPreset | null>(null);

  const notes = Object.values(notesBySlot);
  const suggested = suggestFactoryPresets(genre, notes)
    .map((slot) => FACTORY_PRESETS.find((p) => p.slot === slot))
    .filter((p): p is FactoryPreset => !!p);

  // Solo in lettura, su un brano salvato: il genere stimato viene salvato subito sul brano.
  const runEstimate = async () => {
    if (!note) return;
    setEstimating(true);
    try {
      const updated = await estimate([note]);
      if (updated === 0) throw new Error('L\'AI non ha restituito un genere.');
      toast({ title: 'Genere stimato', description: 'Salvato sul brano. Puoi cambiarlo in modifica.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast({ title: message.includes('429') ? 'Limite AI raggiunto' : 'Stima non riuscita', description: message.includes('429') ? 'Attendi un minuto e riprova.' : message || 'Riprova più tardi.', variant: 'destructive' });
    } finally {
      setEstimating(false);
    }
  };

  const triggerLabel = !isGenre(genre)
    ? 'Scegli un genere per i consigli'
    : notes.length === 0
      ? 'Schede di fabbrica non ancora generate'
      : suggested.length === 0
        ? `Nessun preset di fabbrica per ${genre}`
        : `${suggested.length} consigliat${suggested.length === 1 ? 'o' : 'i'} per ${genre}`;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="song-genre" className="text-caption font-black uppercase tracking-tighter text-muted-foreground">Genere</label>
        <div className="flex gap-2">
          <Select value={isGenre(genre) ? genre : NO_GENRE} onValueChange={(v) => onGenreChange(v === NO_GENRE ? '' : v)} disabled={!editMode}>
            <SelectTrigger id="song-genre" className="h-11 flex-1 border-border bg-background/50 text-body-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_GENRE}>Nessun genere</SelectItem>
              {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          {!editMode && note && !isGenre(genre) && (
            <Button variant="outline" className="min-h-11 shrink-0 gap-2" disabled={estimating} onClick={runEstimate}>
              {estimating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Stima con AI
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-caption font-black uppercase tracking-tighter text-muted-foreground">Preset di fabbrica consigliati</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 w-full justify-between gap-2 bg-background/50 text-body-sm font-normal" disabled={!isGenre(genre)}>
              <span className="flex min-w-0 items-center gap-2"><Factory className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{triggerLabel}</span></span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
            <DropdownMenuLabel className="text-caption text-muted-foreground">Scegli per inserirlo in uno slot</DropdownMenuLabel>
            {suggested.map((preset) => {
              const card = notesBySlot[factoryNoteId(preset.slot)];
              return (
                <DropdownMenuItem key={preset.slot} className="min-h-11 flex-col items-start gap-0.5" onSelect={() => setToSend(preset)}>
                  <span className="font-semibold"><span className="font-mono text-primary">{formatSlotLabel(preset.slot)}</span> · {preset.name}</span>
                  {card && <span className="text-caption text-muted-foreground">{card.soundType} · {card.genres.join(', ')}</span>}
                </DropdownMenuItem>
              );
            })}
            {suggested.length === 0 && (
              <p className="px-2 py-2 text-caption text-muted-foreground">
                {notes.length === 0 ? 'Genera le schede AI nella Libreria, sezione Fabbrica.' : 'Nessuna scheda di fabbrica indica questo genere.'}
              </p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-11">
              <Link href="/library/factory">Tutti i preset di fabbrica</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
