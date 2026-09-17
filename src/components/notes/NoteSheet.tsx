"use client"

import React, { useEffect } from 'react';

interface NoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  disableGestures?: boolean;
}

export function NoteSheet({ isOpen, onClose, children, disableGestures = false }: NoteSheetProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disableGestures) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, disableGestures]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !disableGestures && onClose()}
      />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-2xl h-[100vh] lg:h-[85vh] bg-background rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col">
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
