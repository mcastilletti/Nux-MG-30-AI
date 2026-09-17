export interface NoteSection {
  id: string;
  type: string;
  text: string;
  chords?: string[];
}

export interface SavedNote {
  id: string;
  title: string;
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
}
