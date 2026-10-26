
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
  /** Posizione della manopola nel blocco: torna in `onChange`, così il genitore può passare un gestore unico e stabile. */
  index?: number;
  onChange: (value: number, index: number) => void;
  className?: string;
  size?: number;
  color?: string; // Hex, HSL or CSS variable
}

/** Pixel di trascinamento verticale per l'intera escursione. */
const FULL_TRAVEL_PX = 200;
/** Spostamento orizzontale oltre il quale il trascinamento diventa fine (K3). */
const FINE_OFFSET_PX = 48;
/** Sensibilità della regolazione fine (con il dito spostato di lato o con Shift). */
const FINE_FACTOR = 0.2;

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End']);

/**
 * Manopola: trascinamento verticale, tastiera e campo numerico.
 * - Regolazione fine (K3): con Shift o spostando il dito di lato di oltre 48px;
 *   il valore avanza in modo relativo, quindi il cambio di modalità non lo fa saltare.
 * - Il campo numerico invia solo alla conferma (Invio o uscita dal campo), mai a ogni cifra (K4).
 * - Trascinamento, frecce e campo numerico entrano nella cronologia undo (K7).
 */
export const RotaryKnob = memo(function RotaryKnob({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  index = 0,
  onChange,
  className,
  size = 64,
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

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arcPercentage = 270 / 360;
  const totalArcLength = circumference * arcPercentage;
  const activePercentage = (value - min) / (max - min);
  const activeLength = totalArcLength * activePercentage;

  return (
    <div className={cn("flex flex-col items-center gap-1 knob-container", className)}>
      <span className="text-label font-medium uppercase text-muted-foreground select-none">{label}</span>
      <div 
        className="relative cursor-ns-resize group touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        aria-valuetext={`${value}${unit}`}
        onDoubleClick={() => {
          onChange((max + min) / 2, index);
          saveToHistory();
        }}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform">
          <circle cx="50" cy="50" r="45" fill="currentColor" className="text-secondary" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          
          <path 
            d="M 25 80 A 40 40 0 1 1 75 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/20"
            strokeLinecap="round"
          />

          <path 
            d="M 25 80 A 40 40 0 1 1 75 80"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${activeLength} ${circumference}`}
            className="transition-[stroke-dasharray] duration-75"
          />

          <g transform={`rotate(${rotation} 50 50)`}>
            <circle cx="50" cy="50" r="38" fill="currentColor" className="text-card" />
            <rect x="47" y="15" width="6" height="15" rx="3" fill={color} className="transition-all" />
          </g>
        </svg>
        
        <div className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity",
          isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
           <span 
             className="text-label font-mono bg-background/90 px-1.5 py-0.5 rounded border shadow-lg"
             style={{ borderColor: color }}
           >
            {value.toFixed(step < 1 ? 1 : 0)}{unit}
            {isFine && <span className="ml-1 text-muted-foreground">fine</span>}
          </span>
        </div>
      </div>
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
        className="no-number-spinner mt-1 h-6 w-16 rounded border border-transparent bg-transparent px-1 text-center text-caption font-mono font-bold outline-none transition-colors focus:border-primary focus:bg-background"
        style={{ color }}
      />
    </div>
  );
});
