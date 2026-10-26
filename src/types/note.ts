export interface NoteSection {
  id: string;
  type: string;
  text: string;
  chords?: string[];
}

export interface SavedNote {
  id: string;
  title: string;
  /** Modello vecchio (prima delle playlist): letti solo dalla migrazione e dai dispositivi non aggiornati. */
  band: string;
  setlist: string;
  generalNotes?: string;
  sections?: NoteSection[];
  presetSlot?: string;
  presetScene?: string;
  order?: number;
  updatedAt?: unknown;
  userId?: string;
  type?: 'song' | 'block';
  blockContent?: string;
  /** Impostato dalla migrazione a playlist su un duplicato: la nota è nascosta e sostituita da quella indicata. */
  mergedInto?: string;
}
