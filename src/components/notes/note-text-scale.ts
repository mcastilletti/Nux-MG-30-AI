/** Testo regolabile delle Note (spec L7, V2): compensa lo zoom bloccato (D3). */
export const NOTE_TEXT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
export const NOTE_TEXT_SCALE_KEY = 'mg30-notes-text-scale';

export function parseTextScale(raw: string | null | undefined): number {
  const value = Number(raw);
  return (NOTE_TEXT_SCALES as readonly number[]).includes(value) ? value : 1;
}

/** Livello successivo (+1) o precedente (-1), fermo agli estremi. */
export function stepTextScale(current: number, direction: 1 | -1): number {
  const levels = NOTE_TEXT_SCALES as readonly number[];
  const index = Math.max(0, levels.indexOf(parseTextScale(String(current))));
  return levels[Math.min(levels.length - 1, Math.max(0, index + direction))];
}

export const formatTextScale = (scale: number) => `${Math.round(scale * 100)}%`;
