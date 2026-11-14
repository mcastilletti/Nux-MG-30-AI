import { ZodError } from 'zod';
import { AiAuthError } from '@/ai/guard';
import { isModelUnavailableError } from '@/ai/model';

/**
 * Esito di una funzione AI chiamata dal client. Le server action che lanciano un errore, in produzione,
 * arrivano al browser con un messaggio generico ("An error occurred in the Server Components render"):
 * le funzioni AI nuove restituiscono invece un esito, con un codice e un messaggio leggibili.
 */
export type AiFailureCode = 'auth' | 'rate-limit' | 'unavailable' | 'ai-config' | 'ai-model' | 'invalid-request' | 'ai-failed';

export interface AiFailure {
  ok: false;
  code: AiFailureCode;
  /** Frase per l'utente. */
  message: string;
  /** Tipo e inizio del messaggio dell'errore (senza chiavi), per capire la causa. */
  detail?: string;
}

export type AiResult<T> = { ok: true; data: T } | AiFailure;

const KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;

/** Toglie eventuali chiavi dal testo e lo accorcia. */
const cleanDetail = (text: string) => text.replace(KEY_PATTERN, '[chiave]').replace(/\s+/g, ' ').trim().slice(0, 500);

/** Trasforma un errore qualsiasi in un esito comprensibile. Non lancia mai. */
export function classifyAiError(error: unknown): AiFailure {
  if (error instanceof AiAuthError) {
    if (error.status === 429) return { ok: false, code: 'rate-limit', message: 'Limite AI raggiunto: attendi un minuto e riprova.' };
    if (error.status === 503) return { ok: false, code: 'unavailable', message: 'Verifica dell’accesso non disponibile: riprova tra poco.' };
    return { ok: false, code: 'auth', message: 'Accedi con Google per usare le funzioni AI.' };
  }
  if (error instanceof ZodError) {
    return { ok: false, code: 'invalid-request', message: 'Richiesta non valida.', detail: cleanDetail(error.message) };
  }
  const name = error instanceof Error ? error.name : 'Errore';
  const raw = error instanceof Error ? error.message : String(error);
  const detail = cleanDetail(`${name}: ${raw}`);
  // Modello ritirato o non accessibile (404): non è un limite né un problema di chiave.
  if (isModelUnavailableError(error)) {
    return { ok: false, code: 'ai-model', message: 'Il modello AI non è più disponibile con questa chiave.', detail };
  }
  if (/GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_API_KEY|API[_ ]KEY|API_KEY_INVALID|UNAUTHENTICATED|PERMISSION_DENIED|\b40[13]\b/i.test(raw)) {
    return { ok: false, code: 'ai-config', message: 'La chiave AI del server manca o non è valida.', detail };
  }
  if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate[ _-]?limit|too many requests/i.test(raw)) {
    return { ok: false, code: 'rate-limit', message: 'Quota o limite AI raggiunto: attendi e riprova.', detail };
  }
  return { ok: false, code: 'ai-failed', message: 'La richiesta all’AI non è riuscita.', detail };
}

/** Testo unico per i messaggi a schermo. */
export const aiFailureText = (failure: AiFailure) => (failure.detail ? `${failure.message} (${failure.detail})` : failure.message);

/** Errore lato client che porta con sé l'esito, per poter decidere (riprovare, spiegare) in base al codice. */
export class AiClientError extends Error {
  constructor(readonly failure: AiFailure) {
    super(aiFailureText(failure));
    this.name = 'AiClientError';
  }
}

/**
 * Vero se il limite sembra giornaliero (quota esaurita fino a domani): riprovare dopo qualche secondo non serve.
 * Il limite dell'app (10 richieste al minuto) non ha `detail`; quello del servizio AI sì.
 */
export const isDailyQuota = (failure: AiFailure) => failure.code === 'rate-limit' && /per ?day|daily|al giorno/i.test(failure.detail ?? '');
