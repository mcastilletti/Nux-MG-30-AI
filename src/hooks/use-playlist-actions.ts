'use client';

import { useCallback } from 'react';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { loadAllNotes, loadPlaylistData } from '@/lib/firestore-playlists';
import { removeNoteFromAll } from '@/lib/playlist-ops';
import { useNotesCache } from '@/stores/use-notes-cache';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';
import type { SavedNote } from '@/types/note';
import { NOTES_MODEL_PLAYLISTS, type Band, type Playlist } from '@/types/playlist';

/**
 * Scritture del modello a playlist (spec PL2–PL9): aggiornano subito la cache
 * locale e poi Firestore. Offline la scrittura resta in coda sul dispositivo
 * (`awaitWrite`). Senza account si aggiorna solo la copia locale.
 */
export function usePlaylistActions() {
  const { firestore } = useFirebase() as { firestore: Firestore };
  const { user } = useUser();
  const { toast } = useToast();
  const uid = user?.uid ?? null;

  const write = useCallback(async (promise: Promise<unknown>) => {
    try {
      await awaitWrite(promise, { online: isOnline() });
      return true;
    } catch (error) {
      console.error('[playlist] scrittura non riuscita', error);
      toast({ title: 'Modifica non salvata nel tuo account', description: 'Controlla la connessione e riprova.', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  /** Salva l'ordine e i preset di una playlist (un solo documento). */
  const savePlaylist = useCallback(async (playlist: Playlist) => {
    usePlaylistsCache.getState().upsertPlaylist(playlist);
    if (!uid) return true;
    return write(setDoc(doc(firestore, 'setlists', playlist.id), { items: playlist.items, updatedAt: serverTimestamp() }, { merge: true }));
  }, [firestore, uid, write]);

  const createBand = useCallback(async (name: string): Promise<Band> => {
    const ref = doc(collection(firestore, 'bands'));
    const band: Band = { id: ref.id, name: name.trim(), userId: uid ?? '', logoUrl: null };
    usePlaylistsCache.setState((state) => ({ bands: [...state.bands, band] }));
    if (uid) await write(setDoc(ref, { name: band.name, userId: uid, logoUrl: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    return band;
  }, [firestore, uid, write]);

  const createPlaylist = useCallback(async (bandId: string, name: string, noteIds: string[] = []): Promise<Playlist> => {
    const ref = doc(collection(firestore, 'setlists'));
    const playlist: Playlist = { id: ref.id, name: name.trim(), bandId, userId: uid ?? '', items: noteIds.map((noteId) => ({ noteId })) };
    usePlaylistsCache.getState().upsertPlaylist(playlist);
    if (uid) await write(setDoc(ref, { name: playlist.name, bandId, userId: uid, items: playlist.items, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    return playlist;
  }, [firestore, uid, write]);

  /** Elimina il brano dal serbatoio e lo toglie da tutte le playlist (PL5). */
  const deleteNoteEverywhere = useCallback(async (note: SavedNote) => {
    const changed = removeNoteFromAll(usePlaylistsCache.getState().playlists, note.id);
    for (const playlist of changed) await savePlaylist(playlist);
    useNotesCache.getState().deleteNote(note.id);
    if (!uid) return true;
    return write(deleteDoc(doc(firestore, 'notes', note.id)));
  }, [firestore, uid, savePlaylist, write]);

  /**
   * Ricarica band, playlist e marcatore dall'account. Se la conversione è stata
   * fatta da un altro dispositivo, ricarica anche le note: la copia locale non
   * ha ancora i duplicati marcati (`mergedInto`).
   */
  const refresh = useCallback(async () => {
    if (!uid) return null;
    const wasConverted = (usePlaylistsCache.getState().marker?.version ?? 0) >= NOTES_MODEL_PLAYLISTS;
    const data = await loadPlaylistData(firestore, uid);
    if (!wasConverted && (data.marker?.version ?? 0) >= NOTES_MODEL_PLAYLISTS) {
      useNotesCache.getState().setNotes(await loadAllNotes(firestore, uid));
    }
    usePlaylistsCache.getState().setData(data);
    return data;
  }, [firestore, uid]);

  return { savePlaylist, createBand, createPlaylist, deleteNoteEverywhere, refresh, signedIn: !!uid };
}
