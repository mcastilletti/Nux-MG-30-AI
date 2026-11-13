'use client';

import React, { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePresetStore } from '@/stores/use-preset-store';
import { cn } from '@/lib/utils';
import { optionControlKind, optionIndexOf } from '@/lib/param-options';

/**
 * Parametro a valori con nome (es. microfono, posizione, Sub Div): niente
 * numeri. Fino a 4 valori, segmenti tutti visibili; oltre, un menu a tendina.
 * Il valore inviato resta `min + indice`, come per la manopola.
 */
export const OptionParam = memo(function OptionParam({ label, options, value, min, index, onChange, className }: {
  label: string;
  options: string[];
  value: number;
  min: number;
  index: number;
  onChange: (value: number, index: number) => void;
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
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <span id={labelId} className="select-none text-caption font-semibold text-soft">{label}</span>
      {optionControlKind(options.length) === 'buttons' ? (
        <div role="radiogroup" aria-labelledby={labelId} className="flex w-full gap-1 rounded-xl border border-border bg-inset p-1">
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
                  'flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-caption font-bold transition-colors',
                  on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <Select value={selected >= 0 ? String(selected) : undefined} onValueChange={(v) => choose(Number(v))}>
          <SelectTrigger aria-labelledby={labelId} className="h-11 w-full bg-inset value-mono text-primary">
            <SelectValue placeholder={String(value)} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option, i) => <SelectItem key={option} value={String(i)} className="min-h-11 font-code">{option}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
});
