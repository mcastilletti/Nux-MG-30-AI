import type { NoteSection } from '@/types/note';
import type { Preset } from '@/types/preset';
import { createDefaultEffects } from '@/lib/default-effects';
import { isGenre } from '@/lib/genres';
import { normalizePresetSuggestion, type PresetSuggestion } from '@/lib/mg30-preset-normalizer';
import { createArchivedSound, type ArchivedSound } from '@/lib/sound-archive';

/** Risposta della funzione AI "brano da richiesta" (vedi src/ai/flows/song-from-prompt.ts). */
export interface AiSongData {
  title: string;
  genre: string;
  generalNotes: string;
  sections: Array<{ type: string; text: string; chords: string[] }>;
  tone: PresetSuggestion;
}

const SECTION_TYPES = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Strum', 'Solo', 'Out'];
const CHORD = /^[A-G][#b]?(m|M|maj7|m7|7|sus4|sus2|add9|dim|aug|5|6|9|m6|m9|maj9|7sus4)?(\/[A-G][#b]?)?$/;
const isRepeat = (c: string) => /^x[2-8]$/.test(c);
const isNewline = (c: string) => c.toUpperCase() === 'NEWLINE';

/** Accordo come lo accetta l'app, o null se l'AI ha scritto altro (testo, simboli strani). */
export function cleanChord(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim();
  if (!c) return null;
  if (isNewline(c)) return 'NEWLINE';
  if (isRepeat(c.toLowerCase())) return c.toLowerCase();
  return CHORD.test(c) ? c : null;
}

export interface AiSongNote {
  title: string;
  genre: string;
  generalNotes: string;
  sections: NoteSection[];
  /** Accordi scartati perché non riconosciuti: si dicono all'utente. */
  droppedChords: number;
}

/**
 * Brano nel formato dell'app, a partire dalla risposta dell'AI. Sezioni e accordi vengono ripuliti:
 * tipi fuori elenco → Verse, accordi non riconosciuti scartati, ripetizioni e "a capo" senza accordo
 * prima eliminati. `toneName` (se il suono è stato salvato nell'Archivio) finisce nelle note generali.
 */
export function aiSongToNote(data: AiSongData, options: { toneName?: string; idSeed?: number } = {}): AiSongNote {
  const seed = options.idSeed ?? Date.now();
  let dropped = 0;
  const sections: NoteSection[] = data.sections.slice(0, 16).map((s, i) => {
    const chords: string[] = [];
    for (const raw of s.chords ?? []) {
      const c = cleanChord(raw);
      if (c === null) { dropped++; continue; }
      // Una ripetizione o un a capo senza un accordo prima, o doppi, non hanno senso.
      const prev = chords[chords.length - 1];
      if ((isRepeat(c) || c === 'NEWLINE') && (prev === undefined || prev === 'NEWLINE' || isRepeat(prev))) continue;
      chords.push(c);
    }
    while (chords.length && chords[chords.length - 1] === 'NEWLINE') chords.pop();
    return {
      id: `section-${seed}-${i}`,
      type: SECTION_TYPES.includes(s.type) ? s.type : 'Verse',
      text: typeof s.text === 'string' ? s.text.trim().slice(0, 300) : '',
      chords,
    };
  });
  const notes = [data.generalNotes?.trim().slice(0, 600), options.toneName ? `Suono proposto dall'AI: «${options.toneName}» (Archivio suoni).` : '']
    .filter(Boolean)
    .join('\n\n');
  return {
    title: data.title.trim().slice(0, 200) || 'Brano senza titolo',
    genre: isGenre(data.genre) ? data.genre : '',
    generalNotes: notes,
    sections,
    droppedChords: dropped,
  };
}

const baseToneEffects = () => createDefaultEffects().map((e) => ({ ...e, parameters: { ...e.parameters } }));

/** Suono proposto dall'AI come suono dell'Archivio (3 scene uguali), con i valori riportati nei range del catalogo. */
export function aiToneToArchivedSound(tone: PresetSuggestion, options: { now?: Date } = {}): { sound: ArchivedSound; warnings: string[] } {
  const base: Preset = {
    slot: 1,
    name: tone.name,
    activeScene: 0,
    category: 'AI',
    tags: ['ai'],
    favorite: false,
    rating: 0,
    lastModified: options.now ?? new Date(),
    ampModel: 'NUX MG-30',
    effects: baseToneEffects(),
    scenes: { 0: baseToneEffects(), 1: baseToneEffects(), 2: baseToneEffects() },
  };
  const { updatedPreset, warnings } = normalizePresetSuggestion(base, tone);
  // Le tre scene partono uguali al suono proposto.
  const clone = () => updatedPreset.effects.map((e) => ({ ...e, parameters: { ...e.parameters } }));
  const preset: Preset = { ...updatedPreset, name: tone.name.trim() || 'Suono AI', scenes: { 0: clone(), 1: clone(), 2: clone() } };
  return { sound: createArchivedSound(preset, 'ai', { name: preset.name, now: options.now }), warnings };
}
