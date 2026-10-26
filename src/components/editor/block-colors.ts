const BLOCK_TYPES_WITH_COLOR = ['wah', 'noise-gate', 'compressor', 'efx', 'amp', 'ir', 'sr', 'modulation', 'delay', 'reverb', 'vol', 'eq'];

/** Colore del blocco: i valori sono variabili CSS in globals.css (--block-*). */
export const getBlockColorVar = (type: string) =>
  BLOCK_TYPES_WITH_COLOR.includes(type) ? `var(--block-${type})` : 'var(--primary)';
