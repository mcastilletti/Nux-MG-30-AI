import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch, type Firestore } from 'firebase/firestore';
import type { SavedNote } from '@/types/note';
import { NOTES_MODEL_DOC, type Band, type NotesModelMarker, type Playlist } from '@/types/playlist';
import { parseBandDoc, parseNotesModelMarker, parsePlaylistDoc } from './playlist-data';
import type { MigrationWriter } from './playlist-migration-run';

/** Scrittore Firestore per `runPlaylistMigration`: un `writeBatch` per blocco. */
export function firestoreMigrationWriter(firestore: Firestore): MigrationWriter {
  return {
    newId: (name) => doc(collection(firestore, name)).id,
    timestamp: () => serverTimestamp(),
    commit: async (ops) => {
      const batch = writeBatch(firestore);
      for (const op of ops) {
        const [first, ...rest] = op.path;
        batch.set(doc(firestore, first, ...rest), op.data, { merge: op.merge });
      }
      await batch.commit();
    },
  };
}

export interface PlaylistData {
  bands: Band[];
  playlists: Playlist[];
  marker: NotesModelMarker | null;
}

/** Band, playlist e marcatore dell'utente. */
export async function loadPlaylistData(firestore: Firestore, uid: string): Promise<PlaylistData> {
  const byUser = (name: string) => getDocs(query(collection(firestore, name), where('userId', '==', uid)));
  const [bandsSnap, setlistsSnap, markerSnap] = await Promise.all([
    byUser('bands'),
    byUser('setlists'),
    getDoc(doc(firestore, 'users', uid, 'settings', NOTES_MODEL_DOC)),
  ]);
  return {
    bands: bandsSnap.docs.map((d) => parseBandDoc(d.id, d.data())).filter((b): b is Band => b !== null),
    playlists: setlistsSnap.docs.map((d) => parsePlaylistDoc(d.id, d.data())).filter((p): p is Playlist => p !== null),
    marker: markerSnap.exists() ? parseNotesModelMarker(markerSnap.data()) : null,
  };
}

/** Tutte le note dell'utente, comprese quelle unite: servono al piano di conversione. */
export async function loadAllNotes(firestore: Firestore, uid: string): Promise<SavedNote[]> {
  const snap = await getDocs(query(collection(firestore, 'notes'), where('userId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedNote));
}
