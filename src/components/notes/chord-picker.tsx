"use client";

import * as React from 'react';
import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CHORD_ROOTS, CHORD_TABLE, getChordPositions } from '@/lib/chord-data';
import { cn } from '@/lib/utils';
import { sequentialIndex } from './chord-edit';

type PickerStep = 'type' | 'letter' | 'quality' | 'multiplier';

/** Selettore a passi: tipo → nota → accordo (oppure a capo / ripetizione). */
function ChordPicker({ onSelect, step, setStep, setSelectedLetter, selectedRoot, setSelectedRoot }: {
  onSelect: (chord: string) => void;
  step: PickerStep;
  setStep: (step: PickerStep) => void;
  setSelectedLetter: (v: string | null) => void;
  selectedRoot: string | null;
  setSelectedRoot: (v: string | null) => void;
}) {
  // Initial step: choose what to insert
  if (step === 'type') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-caption font-bold uppercase text-muted-foreground tracking-wider">Inserisci</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setStep('letter')}
            className="p-3 flex flex-col items-center gap-1 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded-lg border border-border/50 transition-colors"
          >
            <span className="text-xl">🎵</span>
            <span className="text-caption uppercase tracking-wide">Accordo</span>
          </button>
          <button
            onClick={() => onSelect('NEWLINE')}
            className="p-3 flex flex-col items-center gap-1 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded-lg border border-border/50 transition-colors"
          >
            <span className="text-xl">↵</span>
            <span className="text-caption uppercase tracking-wide">A Capo</span>
          </button>
          <button
            onClick={() => setStep('multiplier')}
            className="p-3 flex flex-col items-center gap-1 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded-lg border border-border/50 transition-colors"
          >
            <span className="text-xl">×</span>
            <span className="text-caption uppercase tracking-wide">Ripeti</span>
          </button>
        </div>
      </div>
    );
  }

  // Multiplier step
  if (step === 'multiplier') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('type')} className="min-h-11 px-2 text-caption text-muted-foreground hover:text-foreground transition-colors">← Indietro</button>
          <p className="text-caption font-bold uppercase text-muted-foreground tracking-wider">Ripetizioni</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[2, 3, 4, 5, 6, 7, 8].map(n => (
            <button
              key={n}
              onClick={() => onSelect(`x${n}`)}
              className="min-h-11 p-2 text-sm font-bold bg-primary/10 hover:bg-primary/20 text-primary rounded border border-primary/20 transition-colors"
            >
              x{n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'letter') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('type')} className="min-h-11 px-2 text-caption text-muted-foreground hover:text-foreground transition-colors">← Indietro</button>
          <p className="text-caption font-bold uppercase text-muted-foreground tracking-wider">Nota</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CHORD_ROOTS.map(root => (
            <button
              key={root}
              onClick={() => {
                setSelectedLetter(root);
                setSelectedRoot(root);
                setStep('quality');
              }}
              className="min-h-11 p-2 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded"
            >
              {root}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'quality' && selectedRoot) {
    const chords = CHORD_TABLE[selectedRoot] || [];
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('letter')} className="min-h-11 px-2 text-caption text-muted-foreground hover:text-foreground transition-colors">← Indietro</button>
          <p className="text-caption font-bold uppercase text-muted-foreground tracking-wider">{selectedRoot}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {chords.map(chord => (
            <button
              key={chord}
              onClick={() => onSelect(chord)}
              className="min-h-11 p-2 text-sm font-bold bg-primary/10 hover:bg-primary/20 text-primary rounded"
            >
              {chord}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Popover di inserimento accordi (M1): resta aperto e ogni scelta va dopo la
 * precedente, così "G" poi "Gm" danno "G, Gm".
 */
function useSequentialPicker(onInsert: (chord: string, index: number) => void, startIndex: number, append = false) {
  const [step, setStep] = useState<PickerStep>('type');
  const [, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const picks = useRef(0);
  const reset = () => { setStep('type'); setSelectedLetter(null); setSelectedRoot(null); picks.current = 0; };
  const picker = (
    <ChordPicker
      // In coda (`append`) il punto di inserimento si sposta già da solo: nessun conteggio.
      onSelect={(chord) => { onInsert(chord, append ? startIndex : sequentialIndex(startIndex, picks.current)); picks.current += 1; }}
      step={step}
      setStep={setStep}
      setSelectedLetter={setSelectedLetter}
      selectedRoot={selectedRoot}
      setSelectedRoot={setSelectedRoot}
    />
  );
  return { picker, reset };
}

export function ChordInsertPopover({ startIndex, onInsert, label, className, append = false }: {
  startIndex: number;
  onInsert: (chord: string, index: number) => void;
  label: string;
  className?: string;
  /** Fine riga: `startIndex` segue già gli inserimenti, le scelte vanno sempre in coda. */
  append?: boolean;
}) {
  const { picker, reset } = useSequentialPicker(onInsert, startIndex, append);
  return (
    <Popover onOpenChange={(open) => { if (open) reset(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/10', className)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">{picker}</PopoverContent>
    </Popover>
  );
}

const isRepeat = (chord: string) => /^x\d+$/i.test(chord.trim());

/** Informazioni mostrate al tocco in lettura (L6): posizioni o spiegazione della ripetizione. */
function ChordInfo({ chord }: { chord: string }) {
  if (isRepeat(chord)) {
    return (
      <div className="space-y-1">
        <p className="border-b border-primary/20 pb-1 text-caption font-bold uppercase text-primary">Ripetizione</p>
        <p className="text-sm">Ripeti la sequenza {chord.trim().substring(1)} volte.</p>
      </div>
    );
  }
  const positions = getChordPositions(chord);
  return (
    <div className="space-y-2">
      <p className="border-b border-primary/20 pb-1 text-caption font-bold uppercase text-primary">Posizioni {chord}</p>
      {positions?.length ? (
        <ol className="space-y-1">
          {positions.map((pos, i) => (
            <li key={`${chord}-${i}`} className="flex items-center gap-2 font-mono text-sm">
              <span className="w-4 text-muted-foreground">{i + 1}.</span>
              <span className="font-bold">{pos}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm italic text-muted-foreground">Posizioni non disponibili</p>
      )}
    </div>
  );
}

/**
 * Accordo toccabile (L6, M2, M3): in lettura mostra le posizioni; in modifica
 * offre "Inserisci prima…", "Inserisci dopo…" e "Rimuovi accordo" con target da 44px.
 */
export function ChordChip({ chord, editMode, className, onInsertAfter, onInsertBefore, onRemove }: {
  chord: string;
  editMode: boolean;
  className?: string;
  onInsertAfter: (chord: string, picksSoFar: number) => void;
  onInsertBefore?: (chord: string, picksSoFar: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'actions' | 'picker'>('actions');
  const direction = useRef<'before' | 'after'>('after');
  const { picker, reset } = useSequentialPicker((c, index) => (direction.current === 'before' && onInsertBefore ? onInsertBefore(c, index) : onInsertAfter(c, index)), 0);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setMode('actions'); reset(); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={editMode ? `Accordo ${chord}: modifica` : (isRepeat(chord) ? `Ripetizione ${chord}` : `Accordo ${chord}: mostra le posizioni`)}
          className={cn('inline-flex min-h-9 items-center rounded-full border px-3 font-black shadow-sm transition-colors', className)}
        >
          {chord}
        </button>
      </PopoverTrigger>
      <PopoverContent className={editMode && mode === 'picker' ? 'w-72 p-4' : 'w-64 p-3'} align="start">
        {!editMode ? (
          <ChordInfo chord={chord} />
        ) : mode === 'picker' ? (
          picker
        ) : (
          <div className="grid gap-1">
            {onInsertBefore && (
              <button type="button" onClick={() => { direction.current = 'before'; setMode('picker'); }} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-secondary">
                <Plus className="h-4 w-4" aria-hidden="true" /> Inserisci prima…
              </button>
            )}
            <button type="button" onClick={() => { direction.current = 'after'; setMode('picker'); }} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-secondary">
              <Plus className="h-4 w-4" aria-hidden="true" /> Inserisci dopo…
            </button>
            <button type="button" onClick={() => { setOpen(false); onRemove(); }} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Rimuovi accordo
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
