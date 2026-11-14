'use client';

import { useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { estimateSongGenres } from '@/ai/flows/song-genre';
import { aiFailureText } from '@/ai/ai-error';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { playlistLabelsFor } from '@/lib/playlist-view';
import { useNotesCache } from '@/stores/use-notes-cache';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';
import type { SavedNote } from '@/types/note';

const BATCH = 40;

/**
 * Stima con l'AI il genere dei brani indicati e lo salva su ciascun brano (campo `genre`,
 * solo quello: il resto della nota non cambia). Restituisce quanti brani sono stati aggiornati.
 */
export function useEstimateSongGenres() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  return useCallback(async (songs: SavedNote[], onProgress?: (done: number, total: number) => void): Promise<number> => {
    if (!user) throw new Error('Accedi per usare le funzioni AI.');
    const { playlists, bands } = usePlaylistsCache.getState();
    let updated = 0;
    for (let i = 0; i < songs.length; i += BATCH) {
      const batch = songs.slice(i, i + BATCH);
      const input = batch.map((s) => {
        const bandNames = [...new Set(playlistLabelsFor(s.id, playlists, bands).map((l) => l.bandName).filter(Boolean))];
        const context = [s.band, ...bandNames].filter((b) => b && b !== 'Senza Band').join(', ');
        return { id: s.id, title: s.title.slice(0, 200), ...(context ? { context: `band: ${context}`.slice(0, 200) } : {}) };
      });
      const result = await estimateSongGenres({ songs: input }, await user.getIdToken());
      if (!result.ok) throw new Error(aiFailureText(result));
      const { genres } = result.data;
      for (const { id, genre } of genres) {
        await awaitWrite(updateDoc(doc(firestore, 'notes', id), { genre }), { online: isOnline() });
        const cached = useNotesCache.getState().getNoteById(id);
        if (cached) useNotesCache.getState().updateNote({ ...cached, genre });
        updated++;
      }
      onProgress?.(Math.min(i + BATCH, songs.length), songs.length);
    }
    return updated;
  }, [user, firestore]);
}
