import type { SVGProps } from 'react';

/**
 * Inline counterpart of the original instrumentation guitar mark.
 * It follows the same 24px, outlined visual language used by the app icons.
 */
export function ElectricGuitarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m13 5 6 6" />
      <path d="m15 3 2 2-1 1 2 2 1-1 2 2-2 2-6-6Z" />
      <path d="m14.5 9.5-5 5" />
      <path d="M9.5 12.5a4.25 4.25 0 1 0 2 2L16 10l-2-2Z" />
      <circle cx="7" cy="17" r="1.25" />
      <path d="m10 14 1 1" />
    </svg>
  );
}
