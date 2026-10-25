'use client';

import * as React from 'react';
import { AArrowDown, AArrowUp, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/common/icon-button';
import { useNoteTextScale } from '@/hooks/use-note-text-scale';
import { useNotesAutoSend } from '@/hooks/use-notes-auto-send';
import { NOTE_TEXT_SCALES, formatTextScale, stepTextScale } from './note-text-scale';

/** Menu ⋮ del foglio in lettura: testo regolabile (L7) e invio automatico del preset (D2). */
export function NoteReadMenu({ showAutoSend = false, children }: { showAutoSend?: boolean; children?: React.ReactNode }) {
  const [scale, setScale] = useNoteTextScale();
  const [autoSend, setAutoSend] = useNotesAutoSend();
  const min = NOTE_TEXT_SCALES[0];
  const max = NOTE_TEXT_SCALES[NOTE_TEXT_SCALES.length - 1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Opzioni di lettura" variant="outline" className="rounded-xl">
          <MoreVertical className="h-5 w-5" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Testo {formatTextScale(scale)}</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 px-1 pb-1">
          <DropdownMenuItem className="min-h-11 justify-center gap-2" disabled={scale <= min} onSelect={(e) => { e.preventDefault(); setScale(stepTextScale(scale, -1)); }}>
            <AArrowDown className="h-5 w-5" aria-hidden="true" /> A−<span className="sr-only"> Testo più piccolo</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 justify-center gap-2" disabled={scale >= max} onSelect={(e) => { e.preventDefault(); setScale(stepTextScale(scale, 1)); }}>
            <AArrowUp className="h-5 w-5" aria-hidden="true" /> A+<span className="sr-only"> Testo più grande</span>
          </DropdownMenuItem>
        </div>
        {showAutoSend && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem className="min-h-11" checked={autoSend} onCheckedChange={(v) => setAutoSend(!!v)} onSelect={(e) => e.preventDefault()}>
              Invia il preset quando apro un brano
            </DropdownMenuCheckboxItem>
          </>
        )}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
