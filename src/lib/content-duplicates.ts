import type { NoteSection, SavedNote } from '@/types/note';
import type { Playlist, PlaylistItem } from '@/types/playlist';
import { effectivePreset, indexNotes, isVisibleNote, resolveNoteId } from './playlist-ops';

/**
 * Note con contenuto identico ma titolo diverso (es. "Hello" e "ACU - Hello").
 * Si tiene una sola nota per gruppo; nelle playlist la nota tenuta prende il
 * posto delle altre, con il loro preset, e le altre vengono eliminate.
 */

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Chiave del contenuto senza titolo; `null` se la nota è vuota (titoli diversi = brani diversi). */
export function contentKey(note: SavedNote): string | null {
  const sections = (note.sections ?? []).map((section: NoteSection) => ({
    type: section.type ?? '',
    text: text(section.text),
    chords: section.chords ?? [],
  }));
  const hasContent = sections.some((s) => s.text || s.chords.length > 0) || !!text(note.blockContent) || !!text(note.generalNotes);
  if (!hasContent) return null;
  return JSON.stringify([note.type === 'block' ? 'block' : 'song', sections, text(note.blockContent), text(note.generalNotes)]);
}

const hasWord = (title: string, word: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${word}([^\\p{L}\\p{N}]|$)`, 'iu').test(title);

/**
 * Ordine di preferenza della nota da tenere: senza "ACU" nel titolo, poi senza
 * "335", poi il titolo più corto, poi in ordine alfabetico.
 */
export function compareKeepers(a: SavedNote, b: SavedNote): number {
  const ta = (a.title || '').trim(); const tb = (b.title || '').trim();
  return Number(hasWord(ta, 'acu')) - Number(hasWord(tb, 'acu'))
    || Number(hasWord(ta, '335')) - Number(hasWord(tb, '335'))
    || ta.length - tb.length
    || ta.localeCompare(tb, 'it')
    || a.id.localeCompare(b.id);
}

export interface ContentGroup { key: string; notes: SavedNote[]; keepId: string }

/** Gruppi di note visibili con lo stesso contenuto, la nota da tenere per prima. */
export function findContentDuplicates(notes: SavedNote[]): ContentGroup[] {
  const groups = new Map<string, SavedNote[]>();
  for (const note of notes) {
    if (!isVisibleNote(note)) continue;
    const key = contentKey(note);
    if (key) groups.set(key, [...(groups.get(key) ?? []), note]);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const sorted = [...group].sort(compareKeepers);
      return { key, notes: sorted, keepId: sorted[0].id };
    })
    .sort((a, b) => (a.notes[0].title || '').localeCompare(b.notes[0].title || '', 'it'));
}

export interface ContentMergePlan {
  /** Playlist modificate (solo quelle cambiate). */
  playlists: Playlist[];
  /** Note da eliminare. */
  deleteIds: string[];
  /** Copie già unite (nascoste) che puntavano a una nota eliminata: ora puntano alla nota tenuta. */
  retarget: { noteId: string; mergedInto: string }[];
}

/**
 * Piano di unione per le scelte fatte: `keep` mappa ogni nota da eliminare
 * nella nota da tenere. Il preset effettivo di ogni brano nelle playlist resta
 * quello di prima.
 */
export function planContentMerge(notes: SavedNote[], playlists: Playlist[], keep: Map<string, string>): ContentMergePlan {
  const byId = indexNotes(notes);
  const changed: Playlist[] = [];
  for (const playlist of playlists) {
    let touched = false;
    const items: PlaylistItem[] = [];
    const present = new Set(playlist.items.map((item) => resolveNoteId(item.noteId, byId)).filter((id): id is string => !!id && !keep.has(id)));
    for (const item of playlist.items) {
      const resolved = resolveNoteId(item.noteId, byId);
      const keeperId = resolved ? keep.get(resolved) : undefined;
      if (!resolved || !keeperId) { items.push(item); continue; }
      touched = true;
      // La nota tenuta c'è già in questa playlist: la copia si toglie.
      if (present.has(keeperId)) continue;
      present.add(keeperId);
      const removed = byId.get(resolved)!;
      const keeper = byId.get(keeperId)!;
      const before = effectivePreset(removed, item);
      const next: PlaylistItem = { noteId: keeperId };
      const after = effectivePreset(keeper, null);
      if (item.presetSlot !== undefined || before.presetSlot !== after.presetSlot || before.presetScene !== after.presetScene) {
        next.presetSlot = before.presetSlot;
        if (before.presetSlot && before.presetScene) next.presetScene = before.presetScene;
      }
      items.push(next);
    }
    if (touched) changed.push({ ...playlist, items });
  }
  const deleteIds = [...keep.keys()];
  const retarget = notes
    .filter((note) => note.mergedInto && keep.has(resolveNoteId(note.id, byId) ?? ''))
    .map((note) => ({ noteId: note.id, mergedInto: keep.get(resolveNoteId(note.id, byId)!)! }));
  return { playlists: changed, deleteIds, retarget };
}
