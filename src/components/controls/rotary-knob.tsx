
"use client"

import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePresetStore } from '@/stores/use-preset-store';

interface RotaryKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Valore iniziale del parametro: il doppio clic ci riporta la manopola (senza, il centro). */
  defaultValue?: number;
  /** Posizione della manopola nel blocco: torna in `onChange`, così il genitore può passare un gestore unico e stabile. */
  index?: number;
  onChange: (value: number, index: number) => void;
  className?: string;
  /** Diametro in px. Senza, 62 px su telefono e 88 px da `lg`. */
  size?: number;
  /** Colore dei punti accesi e del valore (CSS). */
  color?: string;
}

/** Pixel di trascinamento verticale per l'intera escursione. */
const FULL_TRAVEL_PX = 200;
/** Spostamento orizzontale oltre il quale il trascinamento diventa fine (K3). */
const FINE_OFFSET_PX = 48;
/** Sensibilità della regolazione fine (con il dito spostato di lato o con Shift). */
const FINE_FACTOR = 0.2;

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End']);

/** Punti dell'anello: 11, ogni 27° da -135° a +135° (270° di corsa). */
const DOT_COUNT = 11;
const CENTER = 31;
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CENTER + r * Math.sin(a), y: CENTER - r * Math.cos(a) };
};
const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => ({ ...polar(-135 + 27 * i, 26), at: (i / (DOT_COUNT - 1)) * 100 }));

/**
 * Manopola: trascinamento verticale, tastiera e campo numerico.
 * - Regolazione fine (K3): con Shift o spostando il dito di lato di oltre 48px;
 *   il valore avanza in modo relativo, quindi il cambio di modalità non lo fa saltare.
 * - Il campo numerico invia solo alla conferma (Invio o uscita dal campo), mai a ogni cifra (K4).
 * - Trascinamento, frecce e campo numerico entrano nella cronologia undo (K7).
 * - Aspetto: cappello crema con un anello di punti che si accendono col valore; nome sotto la manopola,
 *   valore e unità sempre visibili.
 */
export const RotaryKnob = memo(function RotaryKnob({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  defaultValue,
  index = 0,
  onChange,
  className,
  size,
  color = 'hsl(var(--primary))'
}: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFine, setIsFine] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [isInputFocused, setIsInputFocused] = useState(false);
  const startX = useRef(0);
  const lastY = useRef(0);
  const rawValue = useRef(value);
  const lastEmitted = useRef(value);
  const pointer = useRef({ x: 0, y: 0, shift: false });
  const rafRef = useRef<number | null>(null);
  const cancelInput = useRef(false);
  const saveToHistory = usePresetStore((s) => s.saveToHistory);

  useEffect(() => {
    if (!isInputFocused) setInputValue(String(value));
  }, [value, isInputFocused]);

  const toStep = (raw: number) => Number((Math.round(raw / step) * step).toFixed(6));

  const commitInputValue = () => {
    const parsed = Number(inputValue);
    if (inputValue.trim() === '' || !Number.isFinite(parsed)) {
      setInputValue(String(value));
      return;
    }
    const stepped = toStep(Math.max(min, Math.min(max, parsed)));
    setInputValue(String(Number(stepped.toFixed(step < 1 ? 4 : 0))));
    if (stepped === value) return;
    onChange(stepped, index);
    saveToHistory();
  };

  const applyPointer = () => {
    rafRef.current = null;
    const { x, y, shift } = pointer.current;
    const fine = shift || Math.abs(x - startX.current) > FINE_OFFSET_PX;
    setIsFine(fine);
    const deltaY = lastY.current - y;
    lastY.current = y;
    const sensitivity = ((max - min) / FULL_TRAVEL_PX) * (fine ? FINE_FACTOR : 1);
    rawValue.current = Math.max(min, Math.min(max, rawValue.current + deltaY * sensitivity));
    const next = toStep(rawValue.current);
    if (next !== lastEmitted.current) {
      lastEmitted.current = next;
      onChange(next, index);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setIsFine(e.shiftKey);
    startX.current = e.clientX;
    lastY.current = e.clientY;
    rawValue.current = value;
    lastEmitted.current = value;
    pointer.current = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    pointer.current = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
    // Un aggiornamento per frame (requestAnimationFrame), con l'ultima posizione.
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(applyPointer);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      applyPointer();
    }
    setIsDragging(false);
    setIsFine(false);
    // Lo stato finale del gesto entra in cronologia.
    saveToHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = e.shiftKey ? step : step * 5;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + delta), index);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - delta), index);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onChange(e.key === 'Home' ? min : max, index);
    }
  };

  // Al rilascio del tasto (anche dopo una ripetizione automatica) una sola voce di cronologia.
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (ARROW_KEYS.has(e.key)) saveToHistory();
  };

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const pointerEnd = polar(-135 + 270 * ratio, 11);
  const percent = ratio * 100;
  const sized = size !== undefined;

  return (
    <div className={cn("flex flex-col items-center gap-1 knob-container", className)}>
      <div
        className={cn(
          "relative cursor-ns-resize touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          !sized && "h-[62px] w-[62px] lg:h-[88px] lg:w-[88px]"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit ? ` ${unit}` : ''}`}
        onDoubleClick={() => {
          const target = defaultValue !== undefined ? defaultValue : (max + min) / 2;
          if (target === value) return;
          onChange(target, index);
          saveToHistory();
        }}
        style={sized ? { width: size, height: size } : undefined}
      >
        <svg viewBox="0 0 62 62" className="h-full w-full" aria-hidden="true">
          {DOTS.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r="2.2" fill={percent >= dot.at - 0.001 ? color : 'hsl(var(--border))'} />
          ))}
          <circle cx={CENTER} cy={CENTER} r="17" fill="#ece4d2" />
          <circle cx={CENTER} cy={CENTER} r="13" fill="#f6f0e2" />
          <path d={`M${CENTER} ${CENTER}L${pointerEnd.x.toFixed(2)} ${pointerEnd.y.toFixed(2)}`} stroke="#2b2622" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {isDragging && isFine && (
          <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-background px-1.5 text-caption font-semibold text-muted-foreground">fine</span>
        )}
      </div>
      <span className="select-none text-center text-caption font-semibold leading-tight text-soft">{label}</span>
      <div className="flex items-baseline justify-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          aria-label={`${label} valore numerico`}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={() => { setIsInputFocused(true); setInputValue(String(value)); }}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={() => {
            if (cancelInput.current) setInputValue(String(value));
            else commitInputValue();
            cancelInput.current = false;
            setIsInputFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur(); // l'uscita dal campo esegue la conferma
            } else if (event.key === 'Escape') {
              cancelInput.current = true; // Esc annulla: nessun invio
              event.currentTarget.blur();
            }
          }}
          className="no-number-spinner h-7 w-14 rounded border border-transparent bg-transparent px-0.5 text-center text-body-sm value-mono outline-none transition-colors focus:border-primary focus:bg-background"
          style={{ color }}
        />
        {unit && <span className="-ml-1 select-none text-caption font-semibold text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
});
