import type { SavedNote } from '@/types/note';

interface BlockNoteInput {
  title: string;
  blockContent: string;
  /** Blocco caricato dalla cache; assente solo per un blocco nuovo. */
  existing: SavedNote | undefined;
  initialBand: string | null | undefined;
  initialSetlist: string | null | undefined;
  notes: SavedNote[];
}

export function buildBlockNoteData({ title, blockContent, existing, initialBand, initialSetlist, notes }: BlockNoteInput) {
  if (existing) {
    return {
      title,
      band: existing.band,
      setlist: existing.setlist,
      type: 'block' as const,
      blockContent,
      order: existing.order ?? 0,
    };
  }

  const band = initialBand || 'Senza Band';
  const setlist = initialSetlist || 'Senza Scaletta';
  const sameSet = notes.filter(note => note.band === band && note.setlist === setlist);
  const order = sameSet.length > 0 ? Math.max(...sameSet.map(note => note.order ?? 0)) + 1 : 0;

  return { title, band, setlist, type: 'block' as const, blockContent, order };
}
