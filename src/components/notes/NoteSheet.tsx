"use client"

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface NoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  disableGestures?: boolean;
}

export function NoteSheet({ isOpen, onClose, children, disableGestures = false }: NoteSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchX, setTouchX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disableGestures) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, disableGestures]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disableGestures) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disableGestures || !isDragging) return;
    setTouchX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (disableGestures || !isDragging) return;
    const diffX = touchStartX - touchX;
    
    // Swipe left threshold (100px) - only horizontal swipe
    if (diffX > 100) {
      onClose();
    }
    
    setIsDragging(false);
    setTouchStartX(0);
    setTouchX(0);
  };

  if (!isOpen) return null;

  const translateX = isDragging ? Math.min(0, touchX - touchStartX) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !disableGestures && onClose()}
      />
      
      {/* Sheet Content */}
      <div 
        ref={sheetRef}
        className={cn(
          "relative w-full max-w-2xl h-[100vh] lg:h-[85vh] bg-background rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col transition-transform duration-75 ease-out",
          isDragging && "transition-none",
          disableGestures && "translate-x-0 translate-y-0"
        )}
        style={{ transform: !disableGestures ? `translate3d(${translateX}px, 0, 0)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle for mobile drag */}
        {!disableGestures && (
          <div className="flex justify-center pt-2 pb-1 lg:hidden">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
