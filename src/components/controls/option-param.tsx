'use client';

import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePresetStore } from '@/stores/use-preset-store';
import { cn } from '@/lib/utils';
import { optionControlKind, optionIndexOf } from '@/lib/param-options';

/**
 * Parametro a valori con nome (es. microfono, posizione, Sub Div): niente
 * numeri. Fino a 4 valori, pulsanti tutti visibili; oltre, un menu a tendina.
 * Il valore inviato resta `min + indice`, come per la manopola.
 */
export const OptionParam = memo(function OptionParam({ label, options, value, min, index, onChange, color, className }: {
  label: string;
  options: string[];
  value: number;
  min: number;
  index: number;
  onChange: (value: number, index: number) => void;
  color: string;
  className?: string;
}) {
  const saveToHistory = usePresetStore((s) => s.saveToHistory);
  const selected = optionIndexOf(value, min, options.length);
  const choose = (optionIndex: number) => {
    if (optionIndex === selected) return;
    onChange(min + optionIndex, index);
    saveToHistory();
  };
  const labelId = `param-${index}-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <div className={cn('flex w-full flex-col items-center gap-2', className)}>
      <span id={labelId} className="text-label font-medium uppercase text-muted-foreground select-none">{label}</span>
      {optionControlKind(options.length) === 'buttons' ? (
        <div role="radiogroup" aria-labelledby={labelId} className="flex w-full gap-1.5">
          {options.map((option, i) => {
            const on = i === selected;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(i)}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-caption font-bold uppercase transition-colors',
                  on ? 'text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
                style={on ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` } : undefined}
              >
                {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" style={{ color }} />}
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <Select value={selected >= 0 ? String(selected) : undefined} onValueChange={(v) => choose(Number(v))}>
          <SelectTrigger aria-labelledby={labelId} className="h-11 w-full font-mono font-bold" style={{ color }}>
            <SelectValue placeholder={String(value)} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option, i) => <SelectItem key={option} value={String(i)} className="min-h-11 font-mono">{option}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
});
