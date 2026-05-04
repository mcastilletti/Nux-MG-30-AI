'use server';
/**
 * @fileOverview Analisi sonora AI per preset MG-30 (Genkit v1.x).
 * 
 * - summarizePreset - Genera un riassunto analitico del suono.
 */

import { ai, z } from '@/ai/genkit';

const PresetSummaryInputSchema = z.object({
  presetName: z.string(),
  ampModel: z.string(),
  activeEffects: z.array(z.string()),
});
export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe("L'analisi testuale divisa in 3 punti chiave."),
});
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const prompt = ai.definePrompt({
  name: 'presetSummaryPrompt',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  config: {
    temperature: 0.7,
  },
  prompt: `Sei un esperto di suoni per chitarra e hardware NUX MG-30. 
Analizza i dati tecnici e descrivi il suono in 3 punti: 
1. Genere musicale consigliato. 
2. Carattere timbrico e dinamico. 
3. Un consiglio tecnico specifico per ottimizzare questo preset sulla MG-30. 

Analizza questo preset:
Nome: {{presetName}}
Amplificatore: {{ampModel}}
Effetti attivi: {{#each activeEffects}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}`,
});

export const presetSummaryFlow = ai.defineFlow(
  {
    name: 'presetSummaryFlow',
    inputSchema: PresetSummaryInputSchema,
    outputSchema: PresetSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Analisi AI fallita.');
    return output;
  }
);

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  return presetSummaryFlow(input);
}
