import type { MigrationPlan } from './playlist-migration';
import { NOTES_MODEL_DOC, NOTES_MODEL_PLAYLISTS } from '@/types/playlist';

/**
 * Applica il piano di conversione (spec §3) a blocchi: band, poi playlist,
 * poi i duplicati (`mergedInto`), e solo alla fine il marcatore di versione.
 * Se si interrompe, il marcatore manca: al nuovo avvio il piano si ricalcola
 * e riusa band e playlist già create (idempotenza, vedi i test del piano).
 * Lo scrittore è iniettabile: Firestore in produzione, finto nei test.
 */
export interface WriteOp {
  path: string[];
  data: Record<string, unknown>;
  /** `merge`: aggiorna solo i campi indicati; altrimenti crea o sostituisce il documento. */
  merge: boolean;
}

export interface MigrationWriter {
  newId: (collection: 'bands' | 'setlists') => string;
  timestamp: () => unknown;
  commit: (ops: WriteOp[]) => Promise<void>;
}

export interface MigrationResult {
  bandIds: Record<string, string>;
  playlistIds: Record<string, string>;
  batches: number;
}

export async function runPlaylistMigration(plan: MigrationPlan, { uid, writer, batchSize = 400, onProgress }: {
  uid: string;
  writer: MigrationWriter;
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<MigrationResult> {
  const now = writer.timestamp();
  const bandIds: Record<string, string> = {};
  const playlistIds: Record<string, string> = {};
  const ops: WriteOp[] = [];

  for (const band of plan.bands) {
    if (band.existingId) { bandIds[band.key] = band.existingId; continue; }
    const id = writer.newId('bands');
    bandIds[band.key] = id;
    ops.push({ path: ['bands', id], data: { name: band.name, userId: uid, logoUrl: null, createdAt: now, updatedAt: now }, merge: false });
  }
  for (const playlist of plan.playlists) {
    const bandId = bandIds[playlist.bandKey];
    if (!bandId) throw new Error(`Band mancante nel piano: ${playlist.bandKey}`);
    if (playlist.existingId) {
      playlistIds[playlist.key] = playlist.existingId;
      ops.push({ path: ['setlists', playlist.existingId], data: { items: playlist.items, updatedAt: now }, merge: true });
    } else {
      const id = writer.newId('setlists');
      playlistIds[playlist.key] = id;
      ops.push({ path: ['setlists', id], data: { name: playlist.name, bandId, userId: uid, items: playlist.items, createdAt: now, updatedAt: now }, merge: false });
    }
  }
  for (const merge of plan.merges) {
    ops.push({ path: ['notes', merge.noteId], data: { mergedInto: merge.mergedInto }, merge: true });
  }

  const chunks: WriteOp[][] = [];
  for (let i = 0; i < ops.length; i += batchSize) chunks.push(ops.slice(i, i + batchSize));
  const marker: WriteOp = {
    path: ['users', uid, 'settings', NOTES_MODEL_DOC],
    data: {
      version: NOTES_MODEL_PLAYLISTS,
      migratedAt: new Date().toISOString(),
      summary: { playlists: plan.summary.playlists, merged: plan.summary.merged, bandsCreated: plan.summary.bandsCreated },
    },
    merge: false,
  };
  const total = chunks.length + 1;
  for (const [i, chunk] of chunks.entries()) {
    await writer.commit(chunk);
    onProgress?.(i + 1, total);
  }
  // Il marcatore va per ultimo: senza, la conversione si può ripetere.
  await writer.commit([marker]);
  onProgress?.(total, total);
  return { bandIds, playlistIds, batches: total };
}
