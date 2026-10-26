'use client';

import { useCallback } from 'react';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { loadAllNotes, loadPlaylistData } from '@/lib/firestore-playlists';
import { removeNoteFromAll } from '@/lib/playlist-ops';
import type { ContentMergePlan } from '@/lib/content-duplicates';
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
    const previous = usePlaylistsCache.getState().playlists.find((p) => p.id === playlist.id);
    usePlaylistsCache.getState().upsertPlaylist(playlist);
    if (!uid) return true;
    const ok = await write(setDoc(doc(firestore, 'setlists', playlist.id), { items: playlist.items, updatedAt: serverTimestamp() }, { merge: true }));
    // Scrittura non riuscita: la copia locale torna com'era, così resta allineata all'account
    // (salvo modifiche successive alla stessa playlist, che non si toccano).
    if (!ok && previous && usePlaylistsCache.getState().playlists.find((p) => p.id === playlist.id) === playlist) {
      usePlaylistsCache.getState().upsertPlaylist(previous);
    }
    return ok;
  }, [firestore, uid, write]);

  const createBand = useCallback(async (name: string, logoUrl: string | null = null): Promise<Band> => {
    const ref = doc(collection(firestore, 'bands'));
    const band: Band = { id: ref.id, name: name.trim(), userId: uid ?? '', logoUrl };
    usePlaylistsCache.setState((state) => ({ bands: [...state.bands, band] }));
    if (uid) await write(setDoc(ref, { name: band.name, userId: uid, logoUrl, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    return band;
  }, [firestore, uid, write]);

  const createPlaylist = useCallback(async (bandId: string, name: string, noteIds: string[] = []): Promise<Playlist> => {
    const ref = doc(collection(firestore, 'setlists'));
    const playlist: Playlist = { id: ref.id, name: name.trim(), bandId, userId: uid ?? '', items: noteIds.map((noteId) => ({ noteId })) };
    usePlaylistsCache.getState().upsertPlaylist(playlist);
    if (uid) await write(setDoc(ref, { name: playlist.name, bandId, userId: uid, items: playlist.items, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    return playlist;
  }, [firestore, uid, write]);

  /** Rinomina una playlist: un solo documento (spec §5). */
  const renamePlaylist = useCallback(async (playlist: Playlist, name: string) => {
    const next = { ...playlist, name: name.trim() };
    usePlaylistsCache.getState().upsertPlaylist(next);
    if (!uid) return true;
    return write(setDoc(doc(firestore, 'setlists', playlist.id), { name: next.name, updatedAt: serverTimestamp() }, { merge: true }));
  }, [firestore, uid, write]);

  /** Elimina una playlist; i brani restano nel serbatoio. */
  const deletePlaylist = useCallback(async (playlist: Playlist) => {
    usePlaylistsCache.getState().removePlaylist(playlist.id);
    if (!uid) return true;
    return write(deleteDoc(doc(firestore, 'setlists', playlist.id)));
  }, [firestore, uid, write]);

  /** Aggiorna nome e logo di una band. `logoUrl: null` toglie il logo. */
  const updateBand = useCallback(async (band: Band, changes: { name: string; logoUrl?: string | null }) => {
    const next: Band = { ...band, name: changes.name.trim(), ...(changes.logoUrl !== undefined ? { logoUrl: changes.logoUrl } : {}) };
    usePlaylistsCache.setState((state) => ({ bands: state.bands.map((b) => (b.id === band.id ? next : b)) }));
    if (!uid) return true;
    const data: Record<string, unknown> = { name: next.name, updatedAt: serverTimestamp() };
    if (changes.logoUrl !== undefined) data.logoUrl = changes.logoUrl;
    return write(setDoc(doc(firestore, 'bands', band.id), data, { merge: true }));
  }, [firestore, uid, write]);

  /**
   * Elimina una band. Le sue playlist vengono spostate in `moveToBandId` oppure,
   * se assente, eliminate. I brani restano sempre nel serbatoio.
   */
  const deleteBand = useCallback(async (band: Band, moveToBandId: string | null) => {
    const own = usePlaylistsCache.getState().playlists.filter((p) => p.bandId === band.id);
    usePlaylistsCache.setState((state) => ({
      bands: state.bands.filter((b) => b.id !== band.id),
      playlists: moveToBandId
        ? state.playlists.map((p) => (p.bandId === band.id ? { ...p, bandId: moveToBandId } : p))
        : state.playlists.filter((p) => p.bandId !== band.id),
    }));
    if (!uid) return true;
    const batch = writeBatch(firestore);
    for (const playlist of own) {
      if (moveToBandId) batch.set(doc(firestore, 'setlists', playlist.id), { bandId: moveToBandId, updatedAt: serverTimestamp() }, { merge: true });
      else batch.delete(doc(firestore, 'setlists', playlist.id));
    }
    batch.delete(doc(firestore, 'bands', band.id));
    return write(batch.commit());
  }, [firestore, uid, write]);

  /** Elimina il brano dal serbatoio e lo toglie da tutte le playlist (PL5). */
  const deleteNoteEverywhere = useCallback(async (note: SavedNote) => {
    const changed = removeNoteFromAll(usePlaylistsCache.getState().playlists, note.id);
    // Se una playlist non si aggiorna, il brano non si elimina: niente riferimenti rotti.
    for (const playlist of changed) {
      if (!(await savePlaylist(playlist))) return false;
    }
    useNotesCache.getState().deleteNote(note.id);
    if (!uid) return true;
    return write(deleteDoc(doc(firestore, 'notes', note.id)));
  }, [firestore, uid, savePlaylist, write]);

  /**
   * Unisce le note con contenuto identico (piano di `planContentMerge`): prima
   * le playlist, poi le copie nascoste, infine elimina le note. Se una playlist
   * non si salva ci si ferma prima di eliminare: nessun riferimento rotto.
   */
  const mergeContentDuplicates = useCallback(async (plan: ContentMergePlan) => {
    for (const playlist of plan.playlists) {
      if (!(await savePlaylist(playlist))) return false;
    }
    const cache = useNotesCache.getState();
    for (const { noteId, mergedInto } of plan.retarget) {
      const note = cache.getNoteById(noteId);
      if (note) cache.updateNote({ ...note, mergedInto });
    }
    for (const id of plan.deleteIds) cache.deleteNote(id);
    if (!uid) return true;
    const batch = writeBatch(firestore);
    for (const { noteId, mergedInto } of plan.retarget) batch.set(doc(firestore, 'notes', noteId), { mergedInto, updatedAt: serverTimestamp() }, { merge: true });
    for (const id of plan.deleteIds) batch.delete(doc(firestore, 'notes', id));
    return write(batch.commit());
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

  return { savePlaylist, createBand, createPlaylist, renamePlaylist, deletePlaylist, updateBand, deleteBand, deleteNoteEverywhere, mergeContentDuplicates, refresh, signedIn: !!uid };
}
