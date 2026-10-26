'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListMinus, ListPlus, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/common/icon-button';
import { cn } from '@/lib/utils';
import { formatSlotLabel } from '@/lib/slot';
import { formatPresetLabel } from '@/components/notes/preset-send';
import type { SavedNote } from '@/types/note';
import type { EffectivePreset } from '@/lib/playlist-ops';
import type { PlaylistLabel } from '@/lib/playlist-view';

/**
 * Riga di un brano o blocco nel modello a playlist (spec PL1, PL2).
 * È un `button` vero per aprire il foglio; il menu ⋮ è un controllo separato.
 */
export const PlaylistNoteRow = React.memo(function PlaylistNoteRow({
  note, position, preset, chips, moreChips = 0, canReorder, isHighlighted, onOpen, onRemoveFromPlaylist, onAddToPlaylists, onDelete,
}: {
  note: SavedNote;
  /** Posizione nella playlist (vista playlist); assente nel serbatoio. */
  position?: number;
  preset: EffectivePreset;
  chips?: PlaylistLabel[];
  moreChips?: number;
  canReorder: boolean;
  isHighlighted?: boolean;
  onOpen: (note: SavedNote) => void;
  onRemoveFromPlaylist?: (note: SavedNote) => void;
  onAddToPlaylists: (note: SavedNote) => void;
  onDelete: (note: SavedNote) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id, disabled: !canReorder });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, opacity: isDragging ? 0.6 : 1 };
  const isBlock = note.type === 'block';
  const presetText = !isBlock && preset.presetSlot ? formatPresetLabel(formatSlotLabel(Number(preset.presetSlot)), preset.presetScene) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-note-row={note.id}
      className={cn(
        'flex items-stretch overflow-hidden rounded-xl border bg-card/60 transition-colors hover:border-primary/50',
        isBlock ? 'border-primary/30 bg-primary/10' : 'border-border',
        isDragging && 'border-primary/50 shadow-2xl shadow-primary/30',
        isHighlighted && 'border-primary ring-2 ring-primary',
      )}
    >
      {canReorder ? (
        <div {...attributes} {...listeners} aria-label={`Trascina per riordinare ${note.title}`} className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/40 hover:text-primary active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </div>
      ) : (
        <div className="w-2 shrink-0" aria-hidden="true" />
      )}
      <button type="button" onClick={() => onOpen(note)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-1 pr-2 text-left">
        {position !== undefined && (
          <span className="w-7 shrink-0 text-right text-caption font-black tabular-nums text-muted-foreground" aria-label={`Posizione ${position}`}>{position}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className={cn('block break-words text-[16px] font-black uppercase leading-tight', isBlock && 'text-primary')}>{note.title || 'Senza titolo'}</span>
          {(presetText || (chips && chips.length > 0)) && (
            <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-label font-bold uppercase">
              {presetText && (
                <span className="text-primary">{presetText}{preset.source === 'playlist' ? <span className="ml-1 normal-case text-muted-foreground">(playlist)</span> : null}</span>
              )}
              {chips?.map((chip) => (
                <span key={chip.id} className="rounded-full border border-border px-2 py-0.5 normal-case text-muted-foreground" title={`${chip.bandName} · ${chip.name}`}>{chip.name}</span>
              ))}
              {moreChips > 0 && <span className="normal-case text-muted-foreground">+{moreChips}</span>}
            </span>
          )}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`Azioni su ${note.title}`} className="m-1 shrink-0 self-center text-muted-foreground">
            <MoreVertical className="h-5 w-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {onRemoveFromPlaylist && (
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => onRemoveFromPlaylist(note)}>
              <ListMinus className="h-4 w-4" aria-hidden="true" /> Togli dalla playlist
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => onAddToPlaylists(note)}>
            <ListPlus className="h-4 w-4" aria-hidden="true" /> Aggiungi a playlist…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 gap-2 text-destructive" onSelect={() => onDelete(note)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> {isBlock ? 'Elimina blocco' : 'Elimina brano'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
