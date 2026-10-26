import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { usePresetStore } from '@/stores/use-preset-store';
import { applyJsonToPreset, parseDirectJsonInput } from './preset-json';
import { PRESET_JSON_CASES } from './preset-json.cases';

// Test di caratterizzazione: l'output registrato prima dello spostamento da
// editor/page.tsx (Fase 4) non deve cambiare con il riordino del codice.
const golden = JSON.parse(readFileSync(join(__dirname, 'preset-json.golden.json'), 'utf8'));
const base = usePresetStore.getState().activePreset;

for (const [name, json] of Object.entries(PRESET_JSON_CASES)) {
  test(`applyJsonToPreset invariato: ${name}`, () => {
    const r = applyJsonToPreset(base, json);
    // Confronto per tipo di blocco: l'ordine della catena non fa parte del risultato
    // (sulla MG-30 varia per preset; l'app parte da createDefaultEffects).
    const byType = (effects: { type: string }[]) => Object.fromEntries([...effects].sort((a, b) => a.type.localeCompare(b.type)).map((e) => [e.type, e]));
    const now = r.updatedPreset.effects.map((e) => ({ type: e.type, model: e.model, enabled: e.enabled, parameters: e.parameters }));
    assert.deepEqual(
      { appliedCount: r.appliedCount, warnings: r.warnings, effects: byType(now) },
      { appliedCount: golden[name].appliedCount, warnings: golden[name].warnings, effects: byType(golden[name].effects) },
    );
  });
}

test('parseDirectJsonInput invariato', () => {
  const inputs = ['{"a":1}', '```json\n{"b":2}\n```', 'testo libero', '{rotto'];
  const strip = (r: { parsed: unknown; looksLikeJson: boolean; error?: string }) => ({ parsed: r.parsed, looksLikeJson: r.looksLikeJson, hasError: !!r.error });
  assert.deepEqual(inputs.map(parseDirectJsonInput).map(strip), golden.parse.map(strip));
});

test('il preset di partenza non viene modificato', () => {
  const before = JSON.stringify(base.effects);
  applyJsonToPreset(base, PRESET_JSON_CASES.signalChain);
  assert.equal(JSON.stringify(base.effects), before);
});
