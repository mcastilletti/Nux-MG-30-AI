/**
 * Esito di una scrittura Firestore con la cache offline attiva.
 * La promise di setDoc/updateDoc si risolve solo quando il server conferma:
 * senza rete resterebbe in attesa per sempre, anche se la scrittura è già
 * salvata sul dispositivo e verrà inviata al ritorno della connessione.
 */
export type WriteOutcome = 'synced' | 'queued';

export async function awaitWrite(write: Promise<unknown>, { online, timeoutMs = 8000 }: { online: boolean; timeoutMs?: number }): Promise<WriteOutcome> {
  if (!online) {
    // Errori successivi (es. permessi) arrivano quando torna la rete: solo log.
    write.catch((err) => console.warn('[firestore] scrittura in coda rifiutata:', err));
    return 'queued';
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'queued'>((resolve) => { timer = setTimeout(() => resolve('queued'), timeoutMs); });
  try {
    return await Promise.race([write.then(() => 'synced' as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
