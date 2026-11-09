import { firebaseConfig } from '@/firebase/config';

/**
 * Protezione delle server action AI: richiede un ID token Firebase valido e
 * limita le chiamate per utente. Le action `'use server'` sono endpoint HTTP
 * pubblici, quindi senza questo controllo chiunque potrebbe consumare la quota
 * Gemini.
 *
 * Il token e' verificato con l'endpoint REST di Identity Toolkit (accounts:lookup),
 * che accetta solo token emessi per questo progetto e non richiede firebase-admin.
 * Il limitatore e' in memoria: vale per istanza (apphosting.yaml ha maxInstances: 1).
 * Con piu' istanze va spostato su uno store condiviso.
 */

const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const MAX_CALLS_PER_WINDOW = 10;
const WINDOW_MS = 60_000;
const MAX_TOKEN_LENGTH = 4096;

const callLog = new Map<string, number[]>();

export class AiAuthError extends Error {
  constructor(message: string, readonly status: 401 | 429 | 503) {
    super(message);
    this.name = 'AiAuthError';
  }
}

async function resolveUid(idToken: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${LOOKUP_URL}?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AiAuthError('Verifica dell’accesso non disponibile. Riprova.', 503);
  }
  if (!res.ok) throw new AiAuthError('Accedi per usare le funzioni AI.', 401);
  const data = (await res.json()) as { users?: { localId?: string; disabled?: boolean }[] };
  const user = data.users?.[0];
  if (!user?.localId || user.disabled) throw new AiAuthError('Accedi per usare le funzioni AI.', 401);
  return user.localId;
}

function checkRateLimit(uid: string, now = Date.now()): void {
  const recent = (callLog.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS_PER_WINDOW) {
    callLog.set(uid, recent);
    throw new AiAuthError('Limite AI raggiunto: attendi un minuto (429).', 429);
  }
  recent.push(now);
  callLog.set(uid, recent);
  // Evita crescita illimitata della mappa.
  if (callLog.size > 1000) {
    for (const [key, times] of callLog) {
      if (times.every((t) => now - t >= WINDOW_MS)) callLog.delete(key);
    }
  }
}

/** Verifica il token e applica il limite. Restituisce l'uid dell'utente. */
export async function authorizeAiCall(idToken: unknown): Promise<string> {
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > MAX_TOKEN_LENGTH) {
    throw new AiAuthError('Accedi per usare le funzioni AI.', 401);
  }
  const uid = await resolveUid(idToken);
  checkRateLimit(uid);
  return uid;
}

/** Solo per i test. */
export function __resetAiRateLimit(): void {
  callLog.clear();
}
