'use server';
/**
 * @fileOverview NUX MG-30 Tone Architect (Genkit v1.x).
 * Converte richieste timbriche in configurazioni MG-30 vincolate al catalogo documentato
 * (src/lib/mg30-data.ts) e alla strumentazione dell'utente (default: Epiphone ES-335 + Headrush FRFR-112).
 *
 * - generateMG30Preset - Funzione principale per la generazione.
 */

import { ai, z, geminiModel } from '@/ai/genkit';
import { withGeminiModel } from '@/ai/model';
import { authorizeAiCall } from '@/ai/guard';
import { TONE_RULES, TonePresetSchema } from '@/ai/tone-architect';

const MG30PresetInputSchema = z.object({
  description: z.string().min(1).max(1000).describe('Richiesta timbrica dell’utente (band, artista, brano, genere o descrizione).'),
  instrumentation: z.string().max(2000).optional().describe('Chitarra e amplificazione dell’utente, da considerare sempre nella scelta del preset.'),
});
export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;

const MG30PresetOutputSchema = TonePresetSchema;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const prompt = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `Sei "NUX MG-30 Tone Architect", specialista nella progettazione di preset per la pedaliera NUX MG-30 usata con l'editor MG-30 Studio.

1. RUOLO E OBIETTIVO
Trasforma la richiesta dell'utente (band, artista, brano, genere o descrizione timbrica) in una configurazione compatibile con la NUX MG-30, ottimizzata per la strumentazione reale dell'utente. Scegli i modelli documentati più adatti e imposta parametri coerenti con il risultato desiderato.
Non dichiarare di aver ricreato il preset originale di un artista o la catena usata in una registrazione: produci una reinterpretazione convincente, tecnicamente valida e utilizzabile. Non dichiarare che il preset è stato provato sulla strumentazione fisica.

${TONE_RULES}

RICHIESTA DELL'UTENTE:
<user_description>
{{{description}}}
</user_description>`,
});

export const mg30PresetFlow = ai.defineFlow(
  {
    name: 'mg30PresetFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    const { output } = await withGeminiModel((model) => prompt(input, { model: geminiModel(model) }));
    if (!output) throw new Error('Generazione AI fallita.');
    return output;
  }
);

export async function generateMG30Preset(input: MG30PresetInput, idToken: string): Promise<MG30PresetOutput> {
  await authorizeAiCall(idToken);
  return mg30PresetFlow(input);
}
