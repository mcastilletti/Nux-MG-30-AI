
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePresetStore } from '@/stores/use-preset-store';

interface RotaryKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
  size?: number;
  color?: string; // Hex, HSL or CSS variable
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  className,
  size = 64,
  color = 'hsl(var(--primary))'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const rafRef = useRef<number | null>(null);
  const { saveToHistory } = usePresetStore();

  const updateFromPointer = (clientY: number, shiftKey = false) => {
    const deltaY = startY.current - clientY;
    const sensitivity = (max - min) / 200;
    let newValue = startValue.current + deltaY * sensitivity;
    if (shiftKey) newValue = startValue.current + (deltaY * sensitivity) / 5;
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(Math.round(newValue / step) * step);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // Throttling tramite requestAnimationFrame per fluidità e performance
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      updateFromPointer(e.clientY, e.shiftKey);
      rafRef.current = null;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Salviamo lo stato finale in cronologia alla fine del trascinamento
    saveToHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = e.shiftKey ? step : step * 5;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + delta));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - delta));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onChange(e.key === 'Home' ? min : max);
    }
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
      <span className="text-[10px] font-medium uppercase text-muted-foreground select-none">{label}</span>
      <div 
        className="relative cursor-ns-resize group touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
        onDoubleClick={() => {
          onChange((max + min) / 2);
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
             className="text-[10px] font-mono bg-background/90 px-1.5 py-0.5 rounded border shadow-lg"
             style={{ borderColor: color }}
           >
            {value.toFixed(step < 1 ? 1 : 0)}{unit}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-mono mt-1 select-none font-bold" style={{ color: color }}>
        {value.toFixed(step < 1 ? 1 : 0)}
      </span>
    </div>
  );
};
