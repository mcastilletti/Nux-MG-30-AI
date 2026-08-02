"use client"

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedNote } from '@/app/notes/page';
import { useNotesCache } from '@/stores/use-notes-cache';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Save, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockEditorContentProps {
  noteId: string | null;
  initialBand?: string | null;
  initialSetlist?: string | null;
  onClose: () => void;
  onUpdate: (note: SavedNote) => void;
  onEditModeChange?: (isEditing: boolean) => void;
}

export function BlockEditorContent({ noteId, initialBand, initialSetlist, onClose, onUpdate, onEditModeChange }: BlockEditorContentProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { getNoteById, notes } = useNotesCache();
  
  const [title, setTitle] = useState('');
  const [blockContent, setBlockContent] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  const loadNote = (note: SavedNote) => {
    setTitle(note.title);
    setBlockContent(note.blockContent || '');
    setEditMode(false);
  };

  useEffect(() => {
    if (noteId && noteId !== 'new-block') {
      const note = getNoteById(noteId);
      if (note) {
        loadNote(note);
      }
    } else if (noteId === 'new-block') {
      handleNewBlock();
    }
  }, [noteId, getNoteById]);

  const handleSaveBlock = async () => {
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
      return;
    }

    // Calculate order for new blocks based on band and setlist
    let orderToSave = 0;
    if (!noteId || noteId === 'new-block') {
      const bandToUse = initialBand || 'Senza Band';
      const setlistToUse = initialSetlist || 'Senza Scaletta';
      const sameSetNotes = notes.filter(n => n.band === bandToUse && n.setlist === setlistToUse);
      orderToSave = sameSetNotes.length > 0 ? Math.max(...sameSetNotes.map(n => n.order ?? 0)) + 1 : 0;
    }

    const noteData = {
      title,
      band: initialBand || 'Senza Band',
      setlist: initialSetlist || 'Senza Scaletta',
      type: 'block' as const,
      blockContent,
      order: orderToSave,
      updatedAt: serverTimestamp(),
      userId: user?.uid
    };

    try {
      if (noteId && noteId !== 'new-block') {
        await updateDoc(doc(firestore, "notes", noteId), noteData);
        onUpdate({ ...noteData, id: noteId } as SavedNote);
      } else {
        const docRef = await addDoc(collection(firestore, "notes"), noteData);
        onUpdate({ ...noteData, id: docRef.id } as SavedNote);
      }
      setEditMode(false);
      toast({ title: "Blocco Salvato nel Cloud" });
    } catch (err) {
      toast({ title: "Errore salvataggio cloud", variant: "destructive" });
      console.error("Errore salvataggio blocco:", err);
    }
  };

  const handleNewBlock = () => {
    setTitle('');
    setBlockContent('');
    setEditMode(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4 py-2 lg:py-4 border-b border-border/50">
        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
           <button onClick={onClose} className="h-9 w-9 lg:h-10 lg:w-10 rounded-full hover:bg-secondary/40 flex items-center justify-center">
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          <div className="flex flex-col flex-1 min-w-0">
            {editMode ? (
              <Input 
                placeholder="Titolo Blocco..." 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="text-xl font-black h-10 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-primary" 
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-black text-primary cursor-pointer">
                {title || "Blocco senza titolo"}
              </h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode && noteId && noteId !== 'new-block' && (
            <button onClick={() => setEditMode(true)} className="h-9 w-9 lg:h-11 lg:w-11 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary flex items-center justify-center" title="Modifica">
              <Pencil className="w-5 h-5 lg:w-7 lg:h-7" />
            </button>
          )}
          {editMode && (
            <div className="flex items-center gap-2">
              <button onClick={() => {
                 if (noteId && noteId !== 'new-block') {
                    const note = getNoteById(noteId);
                    if (note) loadNote(note);
                    setEditMode(false);
                 } else {
                    onClose();
                 }
              }} className="h-9 w-9 lg:h-11 lg:w-11 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center" title="Annulla">
                <X className="w-5 h-5 lg:w-7 lg:h-7" />
              </button>
              <button onClick={handleSaveBlock} className="h-9 w-9 lg:h-11 lg:w-11 bg-primary shadow-lg rounded-full flex items-center justify-center" title="Salva">
                <Save className="w-5 h-5 lg:w-7 lg:h-7" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Textarea 
          placeholder="Scrivi qui il contenuto del blocco..." 
          className={cn(
            "w-full min-h-[400px] text-[16px] bg-card/30 border-border/50 resize-none leading-relaxed p-4",
            !editMode && "bg-transparent border-none"
          )}
          value={blockContent}
          onChange={(e) => setBlockContent(e.target.value)}
          readOnly={!editMode}
        />
      </div>
    </div>
  );
}