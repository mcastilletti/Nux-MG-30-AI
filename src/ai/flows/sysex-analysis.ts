'use server';
/**
 * @fileOverview Reverse engineering MIDI SysEx (Genkit v1.x).
 * 
 * - analyzeSysEx - Analizza sequenze hex per mappare parametri hardware.
 */

import { ai, z } from '@/ai/genkit';

const AnalyzeSysExInputSchema = z.object({
  sysexData: z.string().describe('Sequenza di messaggi SysEx in formato hex.'),
  controlDescription: z.string().describe('Azione eseguita sull hardware (es: gain da 0 a 100).'),
});
export type AnalyzeSysExInput = z.infer<typeof AnalyzeSysExInputSchema>;

const AnalyzeSysExOutputSchema = z.object({
  parameterMapping: z.string().describe('Spiegazione tecnica dettagliata del mapping identificato.'),
});
export type AnalyzeSysExOutput = z.infer<typeof AnalyzeSysExOutputSchema>;

const prompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  input: { schema: AnalyzeSysExInputSchema },
  output: { schema: AnalyzeSysExOutputSchema },
  prompt: `Sei un ingegnere MIDI esperto nel protocollo NUX. 
Analizza questi dati SysEx per identificare l'offset del parametro, il range di valori e la struttura del messaggio.

Dati SysEx: {{{sysexData}}}
Azione hardware descritta: {{{controlDescription}}}

Fornisci un mapping tecnico preciso, evidenziando i byte che cambiano e il loro significato.`,
});

export const analyzeSysExFlow = ai.defineFlow(
  {
    name: 'analyzeSysExFlow',
    inputSchema: AnalyzeSysExInputSchema,
    outputSchema: AnalyzeSysExOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Analisi SysEx fallita.');
    return output;
  }
);

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  return analyzeSysExFlow(input);
}
