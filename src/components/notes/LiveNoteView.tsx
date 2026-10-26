'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AArrowDown, AArrowUp, Lock, LockOpen, LogOut, Maximize, MoreVertical, Sun } from 'lucide-react';
import { useNotesCache } from '@/stores/use-notes-cache';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/common/icon-button';
import { useNoteTextScale } from '@/hooks/use-note-text-scale';
import { useNotePresetSender } from '@/hooks/use-note-preset-sender';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useLongPress } from '@/hooks/use-long-press';
import { useLocalFlag } from '@/hooks/use-local-flag';
import { GUARD_HISTORY_RESTORED_EVENT } from '@/hooks/use-unsaved-changes-guard';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import { SECTION_COLORS, type SectionType } from '@/lib/section-colors';
import { NOTE_TEXT_SCALES, formatTextScale, stepTextScale } from './note-text-scale';
import { formatPresetLabel, getPresetChipState, readAutoSendSetting } from './preset-send';

export const LIVE_LOCK_KEY = 'mg30-live-locked';

const sectionBarClass = (type: string) => SECTION_COLORS[type as SectionType]?.bar ?? 'bg-muted-foreground';

/**
 * Modalità Live (spec V1–V11): sola lettura, testo grande, alto contrasto,
 * blocco anti-tocco. Prec/Succ e scelta del brano sono nella barra in fondo al foglio.
 */
export function LiveNoteView({ noteId, position, onExit }: {
  noteId: string;
  position?: { index: number; total: number } | null;
  onExit: () => void;
}) {
  const note = useNotesCache((state) => state.notes.find((n) => n.id === noteId));
  const [scale, setScale] = useNoteTextScale();
  const [locked, setLocked] = useLocalFlag(LIVE_LOCK_KEY, false);
  const wakeLockActive = useWakeLock();
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  // Se il wake lock non arriva entro 3 s (permesso negato, risparmio energetico) lo si dice.
  const [wakeLockTimedOut, setWakeLockTimedOut] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const { send, sent, resetSent, connected } = useNotePresetSender();
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    setWakeLockSupported('wakeLock' in navigator);
    setFullscreenAvailable(!!document.fullscreenEnabled);
    const timer = window.setTimeout(() => setWakeLockTimedOut(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  // V4 + D2: passare a un brano equivale ad aprirlo. Se la nota arriva dopo
  // (link Live senza copia in cache) l'invio parte quando diventa disponibile,
  // una sola volta per brano.
  const autoSentFor = useRef<string | null>(null);
  const noteAvailable = !!note;
  useEffect(() => {
    if (autoSentFor.current !== noteId) resetSent();
    if (!note || autoSentFor.current === noteId) return;
    autoSentFor.current = noteId;
    if (note.type !== 'block' && readAutoSendSetting(window.localStorage)) send(note.presetSlot, note.presetScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, noteAvailable]);

  // V9: Indietro esce dalla Live senza chiudere il foglio.
  useEffect(() => {
    window.history.pushState(window.history.state, '', window.location.href);
    let ours = true;
    const onPop = () => { ours = false; exitRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (ours) {
        const restored = () => {
          window.removeEventListener('popstate', restored);
          window.dispatchEvent(new Event(GUARD_HISTORY_RESTORED_EVENT));
        };
        window.addEventListener('popstate', restored);
        window.history.back();
      }
    };
  }, []);

  // Esc non esce dalla Live: chiude solo menu e pannelli (e un tasto premuto per sbaglio sul palco non ha effetto).

  const unlock = useLongPress(() => setLocked(false), 1000);

  if (!note) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-black p-6 text-center text-zinc-100">
        <p className="text-lg font-bold">Brano non disponibile su questo dispositivo</p>
        <button type="button" onClick={onExit} className="min-h-12 rounded-xl border border-zinc-700 px-4 font-semibold">Esci dalla Live</button>
      </div>
    );
  }

  const chip = note.type !== 'block' && note.presetSlot ? {
    label: formatPresetLabel(formatSlotLabel(Number(note.presetSlot)), note.presetScene),
    state: getPresetChipState({ connected, sent }),
  } : null;
  const min = NOTE_TEXT_SCALES[0];
  const max = NOTE_TEXT_SCALES[NOTE_TEXT_SCALES.length - 1];

  return (
    <div className="flex min-h-full flex-col bg-black text-zinc-50" data-live-view>
      <header className="sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-800 bg-black/95 px-3 py-2.5 backdrop-blur">
        <span className="text-base font-black tabular-nums text-zinc-400" aria-label={position ? `Brano ${position.index} di ${position.total}` : undefined}>
          {position ? `${position.index}/${position.total}` : 'LIVE'}
        </span>
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-lg font-extrabold leading-tight" title={note.title}>{note.title || 'Senza titolo'}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {chip && (
              <button
                type="button"
                onClick={() => send(note.presetSlot, note.presetScene)}
                disabled={!connected}
                aria-label={`Preset ${chip.label}: ${connected ? chip.state.text : 'pedaliera non collegata'}. Tocca per inviarlo alla pedaliera`}
                className={cn('inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-caption font-semibold',
                  chip.state.tone === 'success' ? 'border-success/50 text-success' : 'border-zinc-700 text-zinc-300')}
              >
                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', chip.state.tone === 'success' ? 'bg-success' : 'bg-zinc-400')} />
                <span className="font-bold">{chip.label}</span> · {chip.state.text}
              </button>
            )}
            <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-caption', wakeLockActive ? 'text-success' : 'text-warning')} role="status">
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              {wakeLockActive ? 'schermo acceso' : wakeLockSupported && !wakeLockTimedOut ? 'schermo: attivazione…' : 'schermo può spegnersi'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {locked ? (
            <button
              type="button"
              {...unlock.handlers}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLocked(false); }}
              aria-label="Bloccato: tieni premuto 1 secondo per sbloccare"
              title="Tieni premuto 1 secondo per sbloccare"
              className="relative flex h-12 w-12 touch-none select-none items-center justify-center rounded-full border-2 border-warning text-warning"
            >
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-full"
                style={{ background: `conic-gradient(hsl(var(--warning)) ${unlock.progress * 360}deg, transparent 0deg)`, WebkitMask: 'radial-gradient(circle, transparent 23px, #000 24px)', mask: 'radial-gradient(circle, transparent 23px, #000 24px)' }}
              />
              <Lock className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <>
              <IconButton label="Blocca i comandi (anti-tocco)" variant="outline" className="rounded-full border-zinc-700 bg-transparent text-zinc-200" onClick={() => setLocked(true)}>
                <LockOpen className="h-5 w-5" />
              </IconButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Opzioni Live" variant="outline" className="rounded-xl border-zinc-700 bg-transparent text-zinc-200">
                    <MoreVertical className="h-5 w-5" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Testo {formatTextScale(scale)}</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                    <DropdownMenuItem className="min-h-11 justify-center gap-2" disabled={scale <= min} onSelect={(e) => { e.preventDefault(); setScale(stepTextScale(scale, -1)); }}>
                      <AArrowDown className="h-5 w-5" aria-hidden="true" /> A−<span className="sr-only"> Testo più piccolo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="min-h-11 justify-center gap-2" disabled={scale >= max} onSelect={(e) => { e.preventDefault(); setScale(stepTextScale(scale, 1)); }}>
                      <AArrowUp className="h-5 w-5" aria-hidden="true" /> A+<span className="sr-only"> Testo più grande</span>
                    </DropdownMenuItem>
                  </div>
                  {fullscreenAvailable && (
                    <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => {}); }}>
                      <Maximize className="h-4 w-4" aria-hidden="true" /> Schermo intero
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="min-h-11 gap-2" onSelect={onExit}>
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Esci dalla Live
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      {locked && (
        <p className="border-b border-zinc-800 bg-zinc-950 px-4 py-1.5 text-center text-caption text-zinc-400">
          Comandi bloccati: restano attivi Prec, Succ e la scelta del brano. Tieni premuto il lucchetto per sbloccare.
        </p>
      )}

      <div className="flex-1 space-y-7 px-4 py-5">
        {note.type === 'block' ? (
          <p className="whitespace-pre-wrap text-[length:calc(22px*var(--note-scale,1))] font-semibold leading-relaxed">{note.blockContent || ''}</p>
        ) : (
          (note.sections || []).map((section) => (
            <section key={section.id} className="grid grid-cols-[6px_minmax(0,1fr)] gap-3">
              <span aria-hidden="true" className={cn('rounded-full', sectionBarClass(section.type))} />
              <div className="min-w-0">
                <h3 className={cn('mb-1.5 text-sm font-black uppercase tracking-widest', SECTION_COLORS[section.type as SectionType]?.text)}>{section.type}</h3>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {(section.chords || []).map((chord, i) => (
                    chord.trim().toUpperCase() === 'NEWLINE'
                      ? <span key={i} className="basis-full" aria-hidden="true" />
                      : <span key={i} className={cn('font-black text-[length:calc(28px*var(--note-scale,1))] leading-tight', /^x\d+$/i.test(chord.trim()) ? 'text-primary' : 'text-zinc-50')}>{chord}</span>
                  ))}
                </div>
                {section.text && <p className="mt-1.5 whitespace-pre-wrap text-[length:calc(22px*var(--note-scale,1))] font-semibold leading-snug text-zinc-100">{section.text}</p>}
              </div>
            </section>
          ))
        )}
        {note.type !== 'block' && note.generalNotes && (
          <p className="whitespace-pre-wrap border-t border-zinc-800 pt-4 text-[length:calc(18px*var(--note-scale,1))] text-zinc-300">{note.generalNotes}</p>
        )}
      </div>
    </div>
  );
}
