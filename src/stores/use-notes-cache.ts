import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SavedNote } from '@/types/note';

interface NotesCacheState {
  notes: SavedNote[];
  lastUpdated: number | null;
  setNotes: (notes: SavedNote[]) => void;
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
      lastUpdated: null,
      
      setNotes: (notes) => set({ notes, lastUpdated: Date.now() }),
      
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
