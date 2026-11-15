import type { SVGProps } from 'react';

/** Chitarra vista di fronte (corpo, buca e manico): intestazione della sezione "Chitarre". Stile Lucide: 24 px, linea da 2. */
export function GuitarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2v7" />
      <path d="M12 9c-2 0-3 1-3 2.5S10 14 9 15c-2 1-3 2.5-3 4.5C6 22 9 22 12 22s6 0 6-2.5c0-2-1-3.5-3-4.5-1-1 0-2 0-3.5S14 9 12 9Z" />
      <circle cx="12" cy="17" r="1.6" />
    </svg>
  );
}
