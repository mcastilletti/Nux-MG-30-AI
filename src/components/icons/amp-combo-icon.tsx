import type { SVGProps } from 'react';

/**
 * Ampli combo: cassa con la fila di manopole e l'altoparlante. Icona di "Strumentazione" nel menu e nella Home;
 * si legge anche a 16 px. Stesso stile delle icone Lucide: 24 px, linea da 2.
 */
export function AmpComboIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="7" cy="6.5" r=".6" fill="currentColor" />
      <circle cx="10" cy="6.5" r=".6" fill="currentColor" />
      <circle cx="13" cy="6.5" r=".6" fill="currentColor" />
      <circle cx="12" cy="14.5" r="3.2" />
    </svg>
  );
}
