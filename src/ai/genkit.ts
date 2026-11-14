import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione centralizzata di Genkit v1.x per Google AI Studio.
 * Il sistema cercherà automaticamente la chiave GOOGLE_GENAI_API_KEY nel file .env.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Modello predefinito di riserva: le funzioni AI lo sostituiscono con quello scelto da withGeminiModel.
  model: googleAI.model(process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'),
});

/**
 * Modello di una chiamata: scelto da `withGeminiModel` (src/ai/model.ts), non scritto qui, perché i nomi dei
 * modelli Gemini vengono ritirati. Passarlo come secondo argomento di `prompt(input, { model })`.
 */
export const geminiModel = (name: string) => googleAI.model(name);

export { z };
