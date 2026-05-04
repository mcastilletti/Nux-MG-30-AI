'use server';
/**
 * @fileOverview AI Tone Designer per NUX MG-30 (Genkit v1.x).
 * Converte descrizioni testuali in configurazioni hardware precise.
 * 
 * - generateMG30Preset - Funzione principale per la generazione.
 */

import { ai, z } from '@/ai/genkit';

const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono o parametri tecnici.'),
});
export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome creativo del preset.'),
  explanation: z.string().describe('Breve spiegazione delle scelte effettuate.'),
  effects: z.array(z.object({
    type: z.enum(['wah', 'noise-gate', 'compressor', 'efx', 'amp', 'ir', 'sr', 'modulation', 'delay', 'reverb', 'vol', 'eq']).describe('Tipo esatto del blocco hardware.'),
    model: z.string().describe('ID del modello specifico.'),
    enabled: z.boolean().describe('Stato attivo/bypass.'),
    parameters: z.array(z.object({
      name: z.string().describe('ID del parametro (es: gain, master, bass).'),
      value: z.number().describe('Valore normalizzato 0-100.')
    }))
  })).describe('Configurazione della catena completa degli effetti.'),
});
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const prompt = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `Sei un traduttore tecnico rigoroso per la pedaliera NUX MG-30. 
    
REGOLE MANDATORIE:
1. Se l'input contiene parametri tecnici specifici (es. GAIN: 65), DEVI APPLICARLI ESATTAMENTE.
2. Usa SOLO questi ID Modello validi:
   - amp: jazzclean, deluxervb, bassmate, tweedy, twinrvb, hiwire, calicrunch, classa15, classa30, plexi100w, plexi45, brit800, 1987x50w, slo100, firemanhbe, dualrect, dievh4, vibroking, match, brit2000, uber.
   - efx: tscream, bluesdrv, morningdrv, reddirt, eatdist, mufffuzz, distone, rcboost, acboost, distplus, katana.
   - compressor: rose, kcomp, studiocomp.
   - modulation: mod-ce1, mod-ce2, mod-ph90, mod-uvibe, mod-tremolo, mod-flanger, mod-vibrator.
   - delay: dly-analog, dly-digital, dly-tape, dly-mod, dly-reverse.
   - reverb: room, hall, plate, spring, shimmer.
   - ir: ir-jz120, ir-dr112, ir-1960, ir-v412, ir-gb412.
   - noise-gate: gate.
   - eq: eq-ge6, eq-10band, eq-para.

3. MAPPATURA TIPI: wah, noise-gate, compressor, efx, amp, ir, sr, modulation, delay, reverb, vol, eq.

Analizza la richiesta e genera una catena completa: {{{description}}}`,
});

export const mg30PresetFlow = ai.defineFlow(
  {
    name: 'mg30PresetFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Generazione AI fallita.');
    return output;
  }
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  return mg30PresetFlow(input);
}
