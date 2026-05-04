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
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
