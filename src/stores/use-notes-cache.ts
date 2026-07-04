import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NoteSection {
  id: string;
  type: string;
  text: string;
  chords?: string[];
}

interface SavedNote {
  id: string;
  title: string;
  band: string;
  setlist: string;
  generalNotes?: string;
  sections?: NoteSection[];
  presetSlot?: string;
  order?: number;
  updatedAt?: any;
  userId?: string;
}

interface NotesCacheState {
  notes: SavedNote[];
  isLoading: boolean;
  lastUpdated: number | null;
  setNotes: (notes: SavedNote[]) => void;
  setLoading: (loading: boolean) => void;
  updateNote: (note: SavedNote) => void;
  addNote: (note: SavedNote) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => SavedNote | undefined;
  clearCache: () => void;
}

export const useNotesCache = create<NotesCacheState>()(
  persist(
    (set, get) => ({
      notes: [],
      isLoading: false,
      lastUpdated: null,
      
      setNotes: (notes) => set({ notes, lastUpdated: Date.now() }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      updateNote: (note) => set((state) => ({
        notes: state.notes.map((n) => (n.id === note.id ? note : n)),
        lastUpdated: Date.now()
      })),
      
      addNote: (note) => set((state) => ({
        notes: [...state.notes, note],
        lastUpdated: Date.now()
      })),
      
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        lastUpdated: Date.now()
      })),
      
      getNoteById: (id) => get().notes.find((n) => n.id === id),
      
      clearCache: () => set({ notes: [], lastUpdated: null })
    }),
    {
      name: 'mg30-notes-cache',
      partialize: (state) => ({
        notes: state.notes,
        lastUpdated: state.lastUpdated
      })
    }
  )
);
