'use server';
/**
 * @fileOverview Schede dei preset di fabbrica della MG-30 (Genkit v1.x): per ogni preset tipo di
 * suono, generi musicali (lista chiusa di src/lib/genres.ts) e note brevi.
 *
 * - describeFactoryPresets - Scrive le schede di un lotto di slot (massimo 8 per chiamata).
 */

import { ai, z } from '@/ai/genkit';
import { authorizeAiCall } from '@/ai/guard';
import { classifyAiError, type AiResult } from '@/ai/ai-error';
import { MG30_MODELS } from '@/lib/mg30-data';
import { FACTORY_PRESETS, describeFactoryPreset } from '@/lib/factory-presets';
import { GENRES, SOUND_TYPES } from '@/lib/genres';

const InputSchema = z.object({
  slots: z.array(z.number().int().min(1).max(128)).min(1).max(8),
});
export type FactoryPresetNotesInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  notes: z.array(z.object({
    slot: z.number().int().describe('Numero dello slot, come nella richiesta.'),
    soundType: z.enum(SOUND_TYPES).describe('Tipo di suono principale.'),
    genres: z.array(z.enum(GENRES)).min(1).max(4).describe('Da 1 a 4 generi in cui il preset funziona meglio, dal più adatto.'),
    notes: z.string().describe('2 o 3 frasi in italiano, massimo 300 caratteri: carattere del suono e come usarlo.'),
  })),
});
export type FactoryPresetNotesOutput = z.infer<typeof OutputSchema>;

const PromptInputSchema = z.object({ presets: z.string() });

const prompt = ai.definePrompt({
  name: 'factoryPresetNotesPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: OutputSchema },
  // Niente "ragionamento" prima della risposta: per schede brevi su dati già pronti rallenta soltanto,
  // e le risposte lente rischiano di superare il tempo massimo di una richiesta sul sito pubblicato.
  config: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  prompt: `Sei un tecnico del suono esperto di chitarra e della pedaliera NUX MG-30.
Per ognuno dei preset di fabbrica qui sotto scrivi una scheda breve in italiano.

Regole:
- Basati solo sui blocchi e sui parametri indicati (modelli reali emulati, gain, effetti) e sul nome del preset.
- Il nome spesso contiene il riferimento all'artista o allo stile (es. "Plexi Lead", "Djent", "80's Clean"): usalo, ma non affermare che è il suono esatto di un disco.
- soundType: il tipo di suono principale.
- genres: da 1 a 4 generi della lista consentita, dal più adatto.
- notes: 2 o 3 frasi, massimo 300 caratteri, senza elenchi: carattere del suono e per cosa usarlo (ritmica, assoli, arpeggi, ecc.).
- Restituisci una scheda per ogni slot, con lo stesso numero di slot.

Preset:
{{{presets}}}`,
});

const flow = ai.defineFlow(
  { name: 'factoryPresetNotesFlow', inputSchema: InputSchema, outputSchema: OutputSchema },
  async ({ slots }) => {
    const presets = slots
      .map((slot) => FACTORY_PRESETS.find((p) => p.slot === slot))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => `- ${describeFactoryPreset(p, MG30_MODELS)}`)
      .join('\n');
    const { output } = await prompt({ presets });
    if (!output) throw new Error('Schede AI non generate.');
    const wanted = new Set(slots);
    return { notes: output.notes.filter((n) => wanted.has(n.slot)) };
  },
);

/**
 * Restituisce un esito invece di lanciare: in produzione Next.js nasconde il messaggio di un errore lanciato
 * da una server action, e così l'utente (e chi guarda i log) non saprebbe cosa è andato storto.
 */
export async function describeFactoryPresets(input: FactoryPresetNotesInput, idToken: string): Promise<AiResult<FactoryPresetNotesOutput>> {
  try {
    await authorizeAiCall(idToken);
    return { ok: true, data: await flow(InputSchema.parse(input)) };
  } catch (error) {
    console.error('[describeFactoryPresets]', error);
    return classifyAiError(error);
  }
}
