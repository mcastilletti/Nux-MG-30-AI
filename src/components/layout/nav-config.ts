/**
 * Architettura informativa approvata in Fase 1 (audit §0.1):
 * - barra mobile: Editor · Library · Note · Band · Altro;
 * - sidebar desktop: Suono / Palco / Sistema.
 */
export type NavKey = 'home' | 'editor' | 'library' | 'notes' | 'bands' | 'instrumentation' | 'settings' | 'sysex';

export interface NavEntry {
  key: NavKey;
  label: string;
  href: string;
}

export const NAV_ENTRIES: Record<NavKey, NavEntry> = {
  home: { key: 'home', label: 'Home', href: '/' },
  editor: { key: 'editor', label: 'Editor', href: '/editor' },
  library: { key: 'library', label: 'Library', href: '/library' },
  notes: { key: 'notes', label: 'Note', href: '/notes' },
  bands: { key: 'bands', label: 'Band', href: '/bands' },
  instrumentation: { key: 'instrumentation', label: 'Strumentazione', href: '/instrumentation' },
  settings: { key: 'settings', label: 'Impostazioni', href: '/settings' },
  sysex: { key: 'sysex', label: 'SysEx Analyzer', href: '/tools/sysex-analyzer' },
};

export const SIDEBAR_GROUPS: { label: string; keys: NavKey[] }[] = [
  { label: 'Generale', keys: ['home'] },
  { label: 'Suono', keys: ['editor', 'library', 'instrumentation'] },
  { label: 'Palco', keys: ['notes', 'bands'] },
  { label: 'Sistema', keys: ['settings', 'sysex'] },
];

/** Voci fisse della barra mobile; tutto il resto è sotto "Altro". */
export const MOBILE_BAR: NavKey[] = ['editor', 'library', 'notes', 'bands'];
export const MOBILE_MORE: NavKey[] = ['home', 'instrumentation', 'settings', 'sysex'];

/** Voce di navigazione della pagina corrente (sottopagine comprese, es. /notes/editor). */
export function getActiveNavKey(pathname: string): NavKey | null {
  const entries = Object.values(NAV_ENTRIES);
  const exact = entries.find((e) => e.href === pathname);
  if (exact) return exact.key;
  const nested = entries
    .filter((e) => e.href !== '/' && pathname.startsWith(e.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return nested?.key ?? null;
}

/** Titolo mostrato nell'header (N2: prima Settings mostrava "App"). */
export function getRouteTitle(pathname: string): string {
  const key = getActiveNavKey(pathname);
  return key ? NAV_ENTRIES[key].label : 'MG30 Studio';
}

/** "Altro" è attivo quando la pagina corrente è una delle sue voci. */
export const isMoreActive = (pathname: string) => {
  const key = getActiveNavKey(pathname);
  return key !== null && MOBILE_MORE.includes(key);
};
