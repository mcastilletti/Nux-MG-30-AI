"use client"

import React, { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useNoteTextScale } from '@/hooks/use-note-text-scale';

interface NoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  disableGestures?: boolean;
  /** Identifica il contenuto mostrato: quando cambia la lettura riparte dall'inizio. */
  contentKey?: string | null;
  /** Barra fissa in fondo al foglio (es. navigazione della scaletta). */
  footer?: React.ReactNode;
}

/**
 * Basato su @radix-ui/react-dialog (non su un listener keydown custom) perché
 * Radix mantiene uno stack condiviso di "layer" dismissable: quando dentro
 * questo foglio è aperto un Select/Popover/DropdownMenu/AlertDialog/Tooltip
 * (anch'essi Radix), un Escape chiude solo il livello più interno e non
 * risale a chiudere anche il foglio. Un document.addEventListener('keydown')
 * a parte, come la vecchia implementazione, non partecipa a quello stack e
 * intercetta l'Escape anche quando è già stato "consumato" da un popup
 * interno, causando chiusure impreviste del foglio (bug osservato in produzione).
 */
export function NoteSheet({ isOpen, onClose, children, disableGestures = false, contentKey, footer }: NoteSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textScale] = useNoteTextScale();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [contentKey]);

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex items-start lg:items-center justify-center outline-none"
          onEscapeKeyDown={(e) => {
            if (disableGestures) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (disableGestures) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (disableGestures) e.preventDefault();
          }}
          // Il Content copre l'intero viewport (serve da contenitore centrante):
          // un click "sul backdrop" è quindi un click sul Content stesso, non
          // su un figlio. Replichiamo qui il vecchio comportamento del backdrop.
          onClick={(e) => {
            if (e.target === e.currentTarget && !disableGestures) onClose();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Nota brano</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Dettaglio e modifica della nota brano selezionata.
          </DialogPrimitive.Description>

          {/* Sheet Content */}
          <div style={{ '--note-scale': textScale } as React.CSSProperties} className="relative w-full max-w-2xl h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:h-[85dvh] lg:pt-0 lg:pb-0 bg-background rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-auto">
              {children}
            </div>
            {footer}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
