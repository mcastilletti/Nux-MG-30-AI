'use server';
/**
 * @fileOverview Genere dei brani (Genkit v1.x): per ogni brano un genere della lista chiusa
 * di src/lib/genres.ts, usato per proporre i preset di fabbrica adatti.
 *
 * - estimateSongGenres - Stima il genere di un lotto di brani (massimo 40 per chiamata).
 */

import { ai, z, geminiModel } from '@/ai/genkit';
import { withGeminiModel } from '@/ai/model';
import { authorizeAiCall } from '@/ai/guard';
import { classifyAiError, type AiResult } from '@/ai/ai-error';
import { GENRES } from '@/lib/genres';

const InputSchema = z.object({
  songs: z.array(z.object({
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(200),
    context: z.string().max(200).optional().describe('Band che suona il brano o altre indicazioni.'),
  })).min(1).max(40),
});
export type SongGenreInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  genres: z.array(z.object({
    id: z.string().describe('Id del brano, come nella richiesta.'),
    genre: z.enum(GENRES).describe('Genere più adatto per scegliere il suono di chitarra.'),
  })),
});
export type SongGenreOutput = z.infer<typeof OutputSchema>;

const prompt = ai.definePrompt({
  name: 'songGenrePrompt',
  input: { schema: z.object({ songs: z.string() }) },
  output: { schema: OutputSchema },
  config: { temperature: 0.1 },
  prompt: `Sei un musicista esperto. Per ogni brano qui sotto scegli il genere della lista consentita che descrive meglio il suono di chitarra del brano originale.
Il titolo può contenere anche l'artista. Il contesto indica la band (spesso una cover band) che lo suona: usalo solo come indizio.
Se non riconosci il brano, scegli il genere più probabile dal titolo e dal contesto.
Restituisci un genere per ogni id.

Brani:
{{{songs}}}`,
});

const flow = ai.defineFlow(
  { name: 'songGenreFlow', inputSchema: InputSchema, outputSchema: OutputSchema },
  async ({ songs }) => {
    const list = songs.map((s) => `- id ${s.id}: "${s.title}"${s.context ? ` (${s.context})` : ''}`).join('\n');
    const { output } = await withGeminiModel((model) => prompt({ songs: list }, { model: geminiModel(model) }));
    if (!output) throw new Error('Generi non stimati.');
    const ids = new Set(songs.map((s) => s.id));
    return { genres: output.genres.filter((g) => ids.has(g.id)) };
  },
);

/** Restituisce un esito invece di lanciare (vedi describeFactoryPresets). */
export async function estimateSongGenres(input: SongGenreInput, idToken: string): Promise<AiResult<SongGenreOutput>> {
  try {
    await authorizeAiCall(idToken);
    return { ok: true, data: await flow(InputSchema.parse(input)) };
  } catch (error) {
    console.error('[estimateSongGenres]', error);
    return classifyAiError(error);
  }
}
