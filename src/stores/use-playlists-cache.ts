import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Band, NotesModelMarker, Playlist } from '@/types/playlist';

/**
 * Copia locale di band, playlist e marcatore di conversione (spec §2), per la
 * lettura offline. Il serbatoio dei brani resta in `mg30-notes-cache`.
 */
interface PlaylistsCache {
  bands: Band[];
  playlists: Playlist[];
  marker: NotesModelMarker | null;
  lastUpdated: number | null;
  setData: (data: { bands: Band[]; playlists: Playlist[]; marker: NotesModelMarker | null }) => void;
  upsertPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  clearCache: () => void;
}

export const usePlaylistsCache = create<PlaylistsCache>()(
  persist(
    (set) => ({
      bands: [],
      playlists: [],
      marker: null,
      lastUpdated: null,
      setData: ({ bands, playlists, marker }) => set({ bands, playlists, marker, lastUpdated: Date.now() }),
      upsertPlaylist: (playlist) => set((state) => ({
        playlists: state.playlists.some((p) => p.id === playlist.id)
          ? state.playlists.map((p) => (p.id === playlist.id ? playlist : p))
          : [...state.playlists, playlist],
      })),
      removePlaylist: (id) => set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) })),
      clearCache: () => set({ bands: [], playlists: [], marker: null, lastUpdated: null }),
    }),
    {
      name: 'mg30-playlists-cache',
      partialize: (state) => ({ bands: state.bands, playlists: state.playlists, marker: state.marker, lastUpdated: state.lastUpdated }),
    },
  ),
);
