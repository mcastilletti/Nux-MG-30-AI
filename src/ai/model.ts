/**
 * Scelta del modello Gemini. I nomi cambiano e vengono ritirati (gemini-2.5-flash non è più disponibile ai
 * progetti nuovi): invece di scrivere un nome nel codice, si chiede a Google l'elenco dei modelli che la chiave
 * può usare, si prova il più recente e, se risponde "non disponibile", si passa al successivo.
 *
 * Per forzare un modello: variabile d'ambiente GEMINI_MODEL (es. gemini-3.5-flash).
 */

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';
/** Ultima scelta se l'elenco non è raggiungibile: nomi plausibili, il ciclo di prova scarta quelli che non esistono. */
const FALLBACK_CANDIDATES = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const MAX_CANDIDATES = 4;

interface ListedModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Dai modelli elencati da Google ricava i candidati: solo "gemini-N[.M]-flash[-lite]" senza varianti
 * (preview, immagini, audio…), dal più recente; a parità di versione prima il flash intero, poi il lite.
 */
export function pickGeminiCandidates(models: ListedModel[]): string[] {
  const found: Array<{ id: string; major: number; minor: number; lite: boolean }> = [];
  for (const model of models) {
    if (!model.supportedGenerationMethods?.includes('generateContent')) continue;
    const id = (model.name ?? '').replace(/^models\//, '');
    const match = /^gemini-(\d+)(?:\.(\d+))?-flash(-lite)?$/.exec(id);
    if (!match) continue;
    found.push({ id, major: Number(match[1]), minor: Number(match[2] ?? 0), lite: !!match[3] });
  }
  found.sort((a, b) => b.major - a.major || b.minor - a.minor || Number(a.lite) - Number(b.lite));
  return [...new Set(found.map((m) => m.id))].slice(0, MAX_CANDIDATES);
}

/** Vero se l'errore dice che il modello non esiste o non è più disponibile (si può provare un altro). */
export function isModelUnavailableError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /\[404|404 Not Found|NOT_FOUND|no longer available|is not found for API version|is not supported for generateContent/i.test(text);
}

/** Prova i candidati nell'ordine finché uno non risponde; gli errori diversi da "modello non disponibile" si propagano. */
export async function runWithModels<T>(candidates: string[], run: (model: string) => Promise<T>, onWorking?: (model: string) => void): Promise<T> {
  let lastError: unknown;
  for (const model of candidates) {
    try {
      const result = await run(model);
      onWorking?.(model);
      return result;
    } catch (error) {
      if (!isModelUnavailableError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error('Nessun modello AI disponibile.');
}

const apiKey = () => process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let workingModel: string | undefined;
let listed: Promise<string[]> | undefined;

async function listCandidates(): Promise<string[]> {
  const key = apiKey();
  if (!key) return FALLBACK_CANDIDATES;
  try {
    const response = await fetch(LIST_URL, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return FALLBACK_CANDIDATES;
    const data = (await response.json()) as { models?: ListedModel[] };
    const picked = pickGeminiCandidates(data.models ?? []);
    return picked.length ? [...picked, ...FALLBACK_CANDIDATES.filter((m) => !picked.includes(m))].slice(0, MAX_CANDIDATES + 1) : FALLBACK_CANDIDATES;
  } catch {
    return FALLBACK_CANDIDATES;
  }
}

/** Esegue `run` con il primo modello che funziona; ricorda quello scelto per le chiamate successive. */
export async function withGeminiModel<T>(run: (model: string) => Promise<T>): Promise<T> {
  const forced = process.env.GEMINI_MODEL?.trim();
  if (forced) return run(forced);
  if (workingModel) {
    try {
      return await run(workingModel);
    } catch (error) {
      if (!isModelUnavailableError(error)) throw error;
      workingModel = undefined; // ritirato nel frattempo: si riparte dall'elenco
      listed = undefined;
    }
  }
  listed ??= listCandidates();
  return runWithModels(await listed, run, (model) => { workingModel = model; });
}
