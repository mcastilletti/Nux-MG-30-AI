/**
 * Unione tra la copia locale di una collezione dell'utente e quella nell'account (Firestore).
 * Funzione pura: la usa createSyncedCollection (src/hooks/create-synced-collection.ts).
 *
 * Regole:
 * - per ogni documento vince la versione con `updatedAt` più recente;
 * - un documento solo locale mai visto nel cloud viene caricato (es. creato prima dell'accesso);
 * - un documento locale già visto nel cloud e ora assente è stato cancellato altrove: si rimuove.
 */
export interface SyncedItem {
  id: string;
  updatedAt: string;
}

export interface LocalCollectionState<T extends SyncedItem> {
  items: Record<string, T>;
  /** id già presenti nel cloud almeno una volta (per distinguere "nuovo" da "cancellato altrove"). */
  synced: string[];
}

export const emptyLocalState = <T extends SyncedItem>(): LocalCollectionState<T> => ({ items: {}, synced: [] });

export function mergeRemote<T extends SyncedItem>(
  local: LocalCollectionState<T>,
  remote: T[],
): { state: LocalCollectionState<T>; upload: T[] } {
  const items: Record<string, T> = {};
  const upload: T[] = [];
  const remoteIds = new Set(remote.map((r) => r.id));
  const wasSynced = new Set(local.synced);

  for (const r of remote) {
    const mine = local.items[r.id];
    if (mine && Date.parse(mine.updatedAt) > Date.parse(r.updatedAt)) {
      items[r.id] = mine;
      upload.push(mine);
    } else {
      items[r.id] = r;
    }
  }
  for (const [id, mine] of Object.entries(local.items)) {
    if (remoteIds.has(id)) continue;
    if (wasSynced.has(id)) continue; // cancellato da un altro dispositivo
    items[id] = mine;
    upload.push(mine);
  }
  return { state: { items, synced: [...new Set([...remoteIds, ...upload.map((u) => u.id)])] }, upload };
}
