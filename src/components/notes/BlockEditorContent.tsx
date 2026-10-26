"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { SavedNote } from '@/types/note';
import { useNotesCache } from '@/stores/use-notes-cache';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Save, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildBlockNoteData } from './block-note-data';
import { getNoteLoadAction } from './note-load-action';
import { serializeDraft } from './note-draft';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SaveStatus } from '@/components/common/save-status';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { NoteReadMenu } from './note-read-menu';

interface BlockEditorContentProps {
  noteId: string | null;
  initialBand?: string | null;
  initialSetlist?: string | null;
  onClose: () => void;
  onUpdate: (note: SavedNote) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  /** Avvia la modalità Live dal brano aperto (menu ⋮). */
  onStartLive?: () => void;
}

export function BlockEditorContent({ noteId, initialBand, initialSetlist, onClose, onUpdate, onEditModeChange, onStartLive }: BlockEditorContentProps) {
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

  // Modifiche non salvate: confronto con l'ultima versione caricata o salvata.
  const savedDraftRef = useRef<string>('');
  const currentDraft = serializeDraft({ title, blockContent });
  const isDirty = editMode && currentDraft !== savedDraftRef.current;
  // NT17: un solo salvataggio alla volta e stato visibile.
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveState = isSaving ? 'saving' : saveFailed ? 'error' : isDirty ? 'dirty' : 'idle';
  const [pendingExit, setPendingExit] = useState<'close' | 'cancel' | null>(null);

  const loadNote = (note: SavedNote) => {
    setTitle(note.title);
    setBlockContent(note.blockContent || '');
    savedDraftRef.current = serializeDraft({ title: note.title, blockContent: note.blockContent || '' });
    setEditMode(false);
  };

  const discardChanges = () => {
    if (noteId && noteId !== 'new-block') {
      const note = getNoteById(noteId);
      if (note) loadNote(note);
      setEditMode(false);
    } else {
      onClose();
    }
  };

  const requestClose = () => (isDirty ? setPendingExit('close') : onClose());

  // In modifica il tasto Indietro di sistema chiude passando dalla stessa conferma.
  useUnsavedChangesGuard({ editing: editMode, dirty: isDirty, onBack: requestClose });

  const existingId = noteId && noteId !== 'new-block' ? noteId : null;
  const cachedNote = useNotesCache(state => (existingId ? state.notes.find(note => note.id === existingId) : undefined));
  const loadedNoteIdRef = useRef<string | null>(null);
  const isNoteMissing = !!existingId && !cachedNote;

  useEffect(() => {
    if (noteId === 'new-block') {
      loadedNoteIdRef.current = null;
      handleNewBlock();
      return;
    }
    const action = getNoteLoadAction({ noteId: existingId, note: cachedNote, loadedNoteId: loadedNoteIdRef.current });
    if (action === 'load' && cachedNote) {
      loadedNoteIdRef.current = cachedNote.id;
      loadNote(cachedNote);
    }
  }, [noteId, existingId, cachedNote]);

  const handleSaveBlock = async () => {
    if (savingRef.current) return;
    if (!user) {
      toast({ title: "Accedi per salvare", description: "Le note si salvano nel tuo account: accedi con Google dal menu laterale.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
      return;
    }

    const isExisting = !!noteId && noteId !== 'new-block';
    const existing = isExisting ? getNoteById(noteId) : undefined;
    if (isExisting && !existing) {
      toast({ title: "Blocco non ancora caricato", description: "Attendi il caricamento delle note e riprova.", variant: "destructive" });
      return;
    }

    const noteData = {
      ...buildBlockNoteData({ title, blockContent, existing, initialBand, initialSetlist, notes }),
      updatedAt: serverTimestamp(),
      userId: user?.uid
    };

    savingRef.current = true;
    setIsSaving(true);
    try {
      const isNew = !noteId || noteId === 'new-block';
      const ref = isNew ? doc(collection(firestore, "notes")) : doc(firestore, "notes", noteId!);
      // Offline la scrittura resta in coda sul dispositivo: non si attende il server (scenario 9).
      const outcome = await awaitWrite(isNew ? setDoc(ref, noteData) : updateDoc(ref, noteData), { online: isOnline() });
      // Un blocco appena creato è già nell'editor: non va ricaricato.
      if (isNew) loadedNoteIdRef.current = ref.id;
      onUpdate({ ...noteData, id: ref.id } as SavedNote);
      savedDraftRef.current = currentDraft;
      setSaveFailed(false);
      setEditMode(false);
      toast(outcome === 'synced'
        ? { title: "Blocco salvato" }
        : { title: "Salvato sul dispositivo", description: "Verrà sincronizzato con il tuo account appena torna la connessione." });
    } catch (err) {
      setSaveFailed(true);
      toast({ title: "Errore salvataggio cloud", variant: "destructive" });
      console.error("Errore salvataggio blocco:", err);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleNewBlock = () => {
    setTitle('');
    setBlockContent('');
    savedDraftRef.current = serializeDraft({ title: '', blockContent: '' });
    setEditMode(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/50 bg-background py-2 lg:py-4">
        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
           <button
             onClick={requestClose}
             className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-xl border-2 border-destructive/70 bg-destructive/15 text-destructive shadow-md transition-colors hover:bg-destructive/25 active:bg-destructive/35 lg:h-14 lg:w-14"
             title="Chiudi nota"
             aria-label="Chiudi nota"
           >
              <X className="h-7 w-7 lg:h-8 lg:w-8" strokeWidth={3} />
            </button>
          <div className="flex flex-col flex-1 min-w-0">
            {editMode ? (
              <Input 
                placeholder="Titolo Blocco..." 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="h-11 border-none bg-transparent p-0 text-2xl font-black text-primary shadow-none focus-visible:ring-0 lg:text-3xl"
                autoFocus
              />
            ) : (
              <h2 className="line-clamp-2 break-words text-2xl font-black text-primary lg:text-3xl" title={title || undefined}>
                {isNoteMissing ? "Blocco non trovato" : (title || "Blocco senza titolo")}
              </h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode && existingId && !isNoteMissing && (
            <button onClick={() => setEditMode(true)} className="h-11 w-11 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary flex items-center justify-center" title="Modifica" aria-label="Modifica blocco">
              <Pencil className="w-5 h-5 lg:w-7 lg:h-7" />
            </button>
          )}
          {!editMode && !isNoteMissing && noteId && noteId !== 'new-block' && <NoteReadMenu onStartLive={onStartLive} />}
          {editMode && (
            <div className="flex items-center gap-2">
              <SaveStatus state={saveState} className="hidden sm:inline-flex" />
              <button onClick={() => (isDirty ? setPendingExit('cancel') : discardChanges())} aria-label="Annulla modifiche" className="h-9 w-9 lg:h-11 lg:w-11 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center" title="Annulla">
                <X className="w-5 h-5 lg:w-7 lg:h-7" />
              </button>
              <button onClick={handleSaveBlock} disabled={isSaving} aria-busy={isSaving} aria-label="Salva blocco" className="h-9 w-9 lg:h-11 lg:w-11 bg-primary text-primary-foreground shadow-lg rounded-full flex items-center justify-center disabled:opacity-60" title="Salva">
                <Save className="w-5 h-5 lg:w-7 lg:h-7" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isNoteMissing ? (
          <div role="status" className="rounded-xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Blocco non disponibile su questo dispositivo</p>
            <p className="mt-1">Attendi il caricamento delle note oppure chiudi e riaprilo dall'elenco.</p>
          </div>
        ) : (
        <Textarea
          placeholder="Scrivi qui il contenuto del blocco..." 
          className={cn(
            "w-full min-h-[400px] bg-card/30 border-border/50 resize-none leading-relaxed p-4",
            editMode ? "text-[16px]" : "bg-transparent border-none text-[length:calc(16px*var(--note-scale,1))]"
          )}
          value={blockContent}
          onChange={(e) => setBlockContent(e.target.value)}
          readOnly={!editMode}
        />
        )}
      </div>

      <AlertDialog open={pendingExit !== null} onOpenChange={(open) => { if (!open) setPendingExit(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uscire senza salvare?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modifiche a questo blocco non sono state salvate e andranno perse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continua a modificare</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = pendingExit;
                setPendingExit(null);
                if (action === 'cancel') discardChanges();
                else onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Esci senza salvare
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
