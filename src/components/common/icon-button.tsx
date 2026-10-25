'use client';

import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Pulsante con sola icona: nome accessibile obbligatorio (aria-label + title)
 * e area di tocco di almeno 44×44px.
 */
export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'children'> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, variant = 'ghost', title, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-label={label}
      title={title ?? label}
      className={cn('h-11 w-11 shrink-0', className)}
      {...props}
    >
      {children}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
