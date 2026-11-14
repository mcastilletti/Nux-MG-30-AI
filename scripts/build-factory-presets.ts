/**
 * Genera src/data/factory-presets.json dai 128 preset di fabbrica decodificati
 * (mg30patch-export/presets.json, prodotto da mg30patch-export/decode_mg30patch.py).
 *
 * Uso: npx tsx scripts/build-factory-presets.ts
 *
 * I valori grezzi della pedaliera diventano valori dell'editor con le stesse regole dell'app:
 * manopole 0..100 → midiValueToParameter; selettori → indice (byte ≥ 128 = tag + indice nei 4 bit bassi).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { MG30_MODELS } from '../src/lib/mg30-data';
import { createDefaultEffects } from '../src/lib/default-effects';
import { midiValueToParameter } from '../src/stores/use-midi-store';
import type { EffectState, EffectType } from '../src/types/preset';
import type { FactoryPreset } from '../src/lib/factory-presets';

type DecodedParam = { id: string; raw: number };
type DecodedBlock = { enabled: boolean; model: string | null; params: DecodedParam[] };
type Decoded = {
  slot: number;
  name: string;
  chain: string[];
  blocks: Record<EffectType, DecodedBlock>;
  userIR: { name: string } | null;
};

const root = join(__dirname, '..');
const decoded: Decoded[] = JSON.parse(readFileSync(join(root, 'mg30patch-export/presets.json'), 'utf8'));
const defaults = createDefaultEffects();

const presets: Omit<FactoryPreset, 'card'>[] = decoded.map((d) => {
  const order = d.chain.filter((t): t is EffectType => defaults.some((e) => e.type === t));
  const effects: EffectState[] = order.map((type) => {
    const base = defaults.find((e) => e.type === type)!;
    const block = d.blocks[type];
    const model = MG30_MODELS[type].find((m) => m.id === block.model);
    if (!model) throw new Error(`Preset ${d.slot}: modello ${type}/${block.model} non presente nell'app`);
    const parameters: Record<string, number> = {};
    for (const p of model.parameters) {
      const raw = block.params.find((q) => q.id === p.id)?.raw;
      if (raw === undefined) parameters[p.id] = p.default;
      else if (p.options) parameters[p.id] = Math.min(p.max, p.min + (raw >= 128 ? raw & 0x0f : raw));
      else parameters[p.id] = midiValueToParameter(raw, p);
    }
    return { id: base.id, type, model: model.id, enabled: block.enabled, parameters };
  });
  return { slot: d.slot, name: d.name, userIR: d.userIR?.name || null, effects };
});

writeFileSync(join(root, 'src/data/factory-presets.json'), JSON.stringify(presets) + '\n');
console.log(`${presets.length} preset di fabbrica scritti in src/data/factory-presets.json`);
