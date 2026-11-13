import JSZip from 'jszip';

import type { Preset } from '@/types/preset';
import { buildPresetExport, presetFileName } from '@/lib/preset-storage';

/**
 * Un file JSON per preset dentro un unico ZIP. Ogni file è un'esportazione completa
 * (formato mg30-studio-presets) con un solo preset, quindi si può reimportare da solo.
 */
export async function buildPresetZip(presets: Preset[], now: Date = new Date()): Promise<Blob> {
  const zip = new JSZip();
  for (const preset of [...presets].sort((a, b) => a.slot - b.slot)) {
    zip.file(presetFileName(preset), JSON.stringify(buildPresetExport([preset], now), null, 2), { date: now });
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' });
}

/** Legge tutti i file .json di uno ZIP (anche in sottocartelle). */
export async function readPresetZip(data: Blob | ArrayBuffer | Uint8Array): Promise<Array<{ name: string; text: string }>> {
  const zip = await JSZip.loadAsync(data);
  const entries = Object.values(zip.files).filter((f) => !f.dir && /\.json$/i.test(f.name) && !f.name.startsWith('__MACOSX/'));
  return Promise.all(entries.map(async (f) => ({ name: f.name, text: await f.async('string') })));
}

export const isZipFile = (file: { name: string; type: string }) =>
  /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
