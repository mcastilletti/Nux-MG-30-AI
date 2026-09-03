import * as React from 'react';

export function ElectricGuitarIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      {...props}
      style={{
        display: 'inline-block',
        backgroundColor: 'currentColor',
        WebkitMaskImage: 'url("/guitar%20icon.png")',
        maskImage: 'url("/guitar%20icon.png")',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        filter: 'brightness(1.35) drop-shadow(0.45px 0 currentColor) drop-shadow(-0.45px 0 currentColor) drop-shadow(0 0.45px currentColor) drop-shadow(0 -0.45px currentColor)',
        ...props.style,
      }}
    />
  );
}
