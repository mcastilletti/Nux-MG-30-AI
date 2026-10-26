"use client"

import { useShallow } from 'zustand/react/shallow';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMidiStore } from '@/stores/use-midi-store';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { NoteSection, SavedNote } from '@/types/note';
import { useNotesCache } from '@/stores/use-notes-cache';
import { getNoteLoadAction } from './note-load-action';
import { serializeDraft } from './note-draft';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { formatPresetLabel, getPresetChipState, readAutoSendSetting } from './preset-send';
import { useNotePresetSender } from '@/hooks/use-note-preset-sender';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Layers, Pencil, X, Copy, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SECTION_COLORS, type SectionType } from '@/lib/section-colors';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatSlotLabel, matchesSlotSearch } from '@/lib/slot';
import { SaveStatus } from '@/components/common/save-status';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { NoteReadMenu } from './note-read-menu';
import { ChordChip, ChordInsertPopover } from './chord-picker';
import { insertAt, removeAt } from './chord-edit';
import { IconButton } from '@/components/common/icon-button';
import { ToastAction } from '@/components/ui/toast';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';
import { usePlaylistActions } from '@/hooks/use-playlist-actions';
import { addNotes, effectivePreset, findItem, itemPresetMode, presetSlotForMode, setItemPreset, type ItemPresetMode } from '@/lib/playlist-ops';
import { playlistLabelsFor } from '@/lib/playlist-view';
import { CopyPlus, ListPlus, Trash2 as TrashIcon } from 'lucide-react';





interface NoteEditorContentProps {
  noteId: string | null;
  onClose: () => void;
  onUpdate: (note: SavedNote) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  /** Avvia la modalità Live dal brano aperto (menu ⋮). */
  onStartLive?: () => void;
  /**
   * `playlists`: modello a serbatoio e playlist (spec playlist). Niente band e
   * scaletta nel brano; il preset si può impostare per la playlist (PL12).
   */
  model?: 'legacy' | 'playlists';
  /** Playlist da cui è aperto il brano (assente = dal serbatoio). */
  playlistId?: string | null;
  onAddToPlaylists?: (note: SavedNote) => void;
  /** `fromDraft`: la versione nasce dalle modifiche in corso, che restano solo nella versione. */
  onCreateVersion?: (note: SavedNote, options?: { fromDraft?: boolean }) => void;
  onDeleteNote?: (note: SavedNote) => void;
}


export function NoteEditorContent({ noteId, onClose, onUpdate, onEditModeChange, onStartLive, model = 'legacy', playlistId = null, onAddToPlaylists, onCreateVersion, onDeleteNote }: NoteEditorContentProps) {
  const { devicePresets, status, sendProgramChange, sendSceneChange } = useMidiStore(useShallow((s) => ({ devicePresets: s.devicePresets, status: s.status, sendProgramChange: s.sendProgramChange, sendSceneChange: s.sendSceneChange })));
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { getNoteById } = useNotesCache();
  
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [selectedPresetScene, setSelectedPresetScene] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); 
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [currentOrder, setCurrentOrder] = useState<number>(0);
  const isPlaylistModel = model === 'playlists';
  const playlists = usePlaylistsCache((state) => state.playlists);
  const bands = usePlaylistsCache((state) => state.bands);
  const { savePlaylist } = usePlaylistActions();
  const playlist = isPlaylistModel && playlistId ? playlists.find((p) => p.id === playlistId) ?? null : null;
  const playlistItem = findItem(playlist, noteId);
  // Preset della playlist (PL12) solo per un brano esistente aperto da una sua playlist.
  const editsPlaylistPreset = !!playlistItem;
  const [presetMode, setPresetMode] = useState<ItemPresetMode>('default');
  const sharedIn = useMemo(() => (isPlaylistModel && noteId ? playlistLabelsFor(noteId, playlists, bands) : []), [isPlaylistModel, noteId, playlists, bands]);

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);



  // Modifiche non salvate: confronto con l'ultima versione caricata o salvata.
  const savedDraftRef = useRef<string>('');
  const currentDraft = serializeDraft({
    title, band, setlist, presetSlot: selectedPresetSlot, presetScene: selectedPresetScene, generalNotes, sections, presetMode,
  });
  const isDirty = editMode && currentDraft !== savedDraftRef.current;
  // NT17: un solo salvataggio alla volta e stato visibile.
  const [isSaving, setIsSaving] = useState(false);
  // Invio del preset (D2) ed etichetta "inviato" (L4), condivisi con la Live.
  const { send: sendNotePreset, sent: presetSent, resetSent: resetPresetSent } = useNotePresetSender();
  const savingRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveState = isSaving ? 'saving' : saveFailed ? 'error' : isDirty ? 'dirty' : 'idle';
  const [pendingExit, setPendingExit] = useState<'close' | 'cancel' | null>(null);

  const discardChanges = () => {
    if (noteId) {
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

  // La nota viene letta dalla cache in modo reattivo: se arriva dopo l'apertura
  // (link diretto, cache vuota) viene caricata appena disponibile.
  const cachedNote = useNotesCache(state => (noteId ? state.notes.find(note => note.id === noteId) : undefined));
  const loadedNoteIdRef = useRef<string | null>(null);
  const isNoteMissing = !!noteId && !cachedNote;
  // Elemento della playlist con cui è stata caricata la nota e ultimo preset inviato:
  // se la playlist arriva dopo (cache vuota, link diretto) il foglio si riallinea.
  const playlistItemKey = playlistItem ? JSON.stringify(playlistItem) : '';
  const loadedItemKeyRef = useRef('');
  const sentPresetRef = useRef('');

  useEffect(() => {
    const action = getNoteLoadAction({ noteId, note: cachedNote, loadedNoteId: loadedNoteIdRef.current });
    if (action === 'new') {
      loadedNoteIdRef.current = null;
      handleNewNote();
    } else if (action === 'load' && cachedNote) {
      loadedNoteIdRef.current = cachedNote.id;
      loadedItemKeyRef.current = playlistItemKey;
      sentPresetRef.current = '';
      loadNote(cachedNote);
      // Letta al momento: lo stato del hook potrebbe non essere ancora sincronizzato.
      if (readAutoSendSetting(window.localStorage)) {
        const preset = effectivePreset(cachedNote, playlistItem);
        sendNotePreset(preset.presetSlot, preset.presetScene);
        sentPresetRef.current = `${preset.presetSlot}|${preset.presetScene}`;
      }
    }
  }, [noteId, cachedNote]);

  // La playlist è arrivata (o è cambiata) dopo il caricamento della nota: in lettura
  // si ricarica il foglio e, se il preset effettivo è diverso, lo si reinvia; in
  // modifica si aggiornano solo i campi del preset, per non salvare il preset sbagliato.
  useEffect(() => {
    if (!cachedNote || loadedNoteIdRef.current !== cachedNote.id || loadedItemKeyRef.current === playlistItemKey) return;
    loadedItemKeyRef.current = playlistItemKey;
    if (editMode) {
      const mode = playlistItem ? itemPresetMode(playlistItem) : 'default';
      setPresetMode(mode);
      setSelectedPresetSlot(playlistItem ? (mode === 'custom' ? playlistItem.presetSlot ?? '' : '') : cachedNote.presetSlot || '');
      setSelectedPresetScene(playlistItem ? (mode === 'custom' ? playlistItem.presetScene ?? '' : '') : cachedNote.presetScene || '');
      return;
    }
    loadNote(cachedNote);
    if (readAutoSendSetting(window.localStorage)) {
      const preset = effectivePreset(cachedNote, playlistItem);
      const key = `${preset.presetSlot}|${preset.presetScene}`;
      if (key !== sentPresetRef.current) {
        sendNotePreset(preset.presetSlot, preset.presetScene);
        sentPresetRef.current = key;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistItemKey]);

  const uniqueBands = useMemo(() => {
    const allNotes = useNotesCache.getState().notes;
    const bands = new Set(allNotes.map(n => n.band).filter(Boolean));
    if (band && !bands.has(band)) bands.add(band);
    return Array.from(bands).sort();
  }, [band]);

  const uniqueSetlists = useMemo(() => {
    const allNotes = useNotesCache.getState().notes;
    const setlists = new Set(
      allNotes
        .filter(n => n.band === band)
        .map(n => n.setlist)
        .filter(Boolean)
    );
    if (setlist && !setlists.has(setlist)) setlists.add(setlist);
    return Array.from(setlists).sort();
  }, [band, setlist]);

  const filteredPresets = useMemo(() => {
    if (!presetSearch) return devicePresets;
    const search = presetSearch.toLowerCase();
    return devicePresets.filter(p => {
      return matchesSlotSearch(p, search);
    });
  }, [devicePresets, presetSearch]);

  const loadNote = (note: SavedNote) => {
    setTitle(note.title);
    setBand(note.band);
    setSetlist(note.setlist);
    // Dalla playlist i campi preset mostrano il preset proprio della playlist; altrimenti il predefinito del brano.
    const item = findItem(playlist, note.id);
    const mode = item ? itemPresetMode(item) : 'default';
    const slot = item ? (mode === 'custom' ? item.presetSlot ?? '' : '') : note.presetSlot || '';
    const scene = item ? (mode === 'custom' ? item.presetScene ?? '' : '') : note.presetScene || '';
    setPresetMode(mode);
    setSelectedPresetSlot(slot);
    setSelectedPresetScene(scene);
    setGeneralNotes(note.generalNotes || '');
    setCurrentOrder(note.order ?? 0);
    const loadedSections = (note.sections || []).map((s, idx) => ({
      ...s,
      id: s.id || `loaded-${idx}-${Date.now()}-${Math.random()}`,
      chords: s.chords || []
    }));
    setSections(loadedSections);
    savedDraftRef.current = serializeDraft({
      title: note.title, band: note.band, setlist: note.setlist,
      presetSlot: slot, presetScene: scene,
      generalNotes: note.generalNotes || '', sections: loadedSections, presetMode: mode,
    });
    setEditMode(false);
    setIsNotesOpen(true);
    resetPresetSent();
  };


  const handleSaveNote = async () => {
    if (savingRef.current) return;
    if (!user) {
      toast({ title: "Accedi per salvare", description: "Le note si salvano nel tuo account: accedi con Google dal menu laterale.", variant: "destructive" });
      return;
    }
    if (isNoteMissing) {
      toast({ title: "Nota non ancora caricata", description: "Attendi il caricamento delle note e riprova.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
      return;
    }

    if (isPlaylistModel) {
      await savePlaylistModelNote();
      return;
    }

    let orderToSave = currentOrder;
    if (!noteId) {
      const allNotes = useNotesCache.getState().notes;
      const sameSetNotes = allNotes.filter(n => n.band === band && n.setlist === setlist);
      orderToSave = sameSetNotes.length > 0 ? Math.max(...sameSetNotes.map(n => n.order ?? 0)) + 1 : 0;
    }

    const noteData = {
      title,
      band: band || 'Senza Band',
      setlist: setlist || 'Senza Scaletta',
      presetSlot: selectedPresetSlot,
      presetScene: selectedPresetScene,
      generalNotes,
      sections,
      order: orderToSave,
      updatedAt: serverTimestamp(),
      userId: user?.uid
    };

    savingRef.current = true;
    setIsSaving(true);
    try {
      const isNew = !noteId;
      const ref = isNew ? doc(collection(firestore, "notes")) : doc(firestore, "notes", noteId!);
      // Offline la scrittura resta in coda sul dispositivo: non si attende il server (scenario 9).
      const outcome = await awaitWrite(isNew ? setDoc(ref, noteData) : updateDoc(ref, noteData), { online: isOnline() });
      // Una nota appena creata è già nell'editor: non va ricaricata (né il preset reinviato).
      if (isNew) loadedNoteIdRef.current = ref.id;
      onUpdate({ ...noteData, id: ref.id } as SavedNote);
      savedDraftRef.current = currentDraft;
      setSaveFailed(false);
      setEditMode(false);
      toast(outcome === 'synced'
        ? { title: "Nota salvata" }
        : { title: "Salvata sul dispositivo", description: "Verrà sincronizzata con il tuo account appena torna la connessione." });
    } catch (err) {
      setSaveFailed(true);
      toast({ title: "Errore salvataggio cloud", variant: "destructive" });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  /**
   * Salvataggio nel modello a playlist: il brano non porta band, scaletta né
   * ordine. Il preset va nel brano oppure, dalla playlist, nell'elemento della
   * playlist (PL12). Un brano nuovo creato da una playlist va in coda (PL9).
   */
  const savePlaylistModelNote = async () => {
    const existing = noteId ? getNoteById(noteId) : undefined;
    const content: Record<string, unknown> = {
      title,
      generalNotes,
      sections,
      updatedAt: serverTimestamp(),
      userId: user?.uid,
    };
    if (!editsPlaylistPreset) {
      content.presetSlot = selectedPresetSlot;
      content.presetScene = selectedPresetScene;
    }
    const isNew = !noteId;
    const data = isNew ? { ...content, band: '', setlist: '', presetSlot: selectedPresetSlot, presetScene: selectedPresetScene } : content;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const ref = isNew ? doc(collection(firestore, "notes")) : doc(firestore, "notes", noteId!);
      const outcome = await awaitWrite(isNew ? setDoc(ref, data) : updateDoc(ref, data), { online: isOnline() });
      if (isNew) loadedNoteIdRef.current = ref.id;
      if (playlist && playlistItem) {
        const next = setItemPreset(playlist, playlistItem.noteId, presetSlotForMode(presetMode, selectedPresetSlot), selectedPresetScene);
        if (JSON.stringify(next.items) !== JSON.stringify(playlist.items)) await savePlaylist(next);
      } else if (isNew && playlist) {
        await savePlaylist(addNotes(playlist, [ref.id]));
      }
      onUpdate({ ...(existing ?? {}), ...data, id: ref.id } as SavedNote);
      savedDraftRef.current = currentDraft;
      setSaveFailed(false);
      setEditMode(false);
      toast(outcome === 'synced'
        ? { title: "Nota salvata" }
        : { title: "Salvata sul dispositivo", description: "Verrà sincronizzata con il tuo account appena torna la connessione." });
    } catch (err) {
      setSaveFailed(true);
      toast({ title: "Errore salvataggio cloud", variant: "destructive" });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleNewNote = () => {
    setTitle('');
    setBand('');
    setSetlist('');
    setSelectedPresetSlot('');
    setSelectedPresetScene('');
    setGeneralNotes('');
    const emptySections = [{ id: `new-${Date.now()}-${Math.random()}`, type: 'Verse', text: '', chords: [] }];
    setSections(emptySections);
    setPresetMode('default');
    savedDraftRef.current = serializeDraft({
      title: '', band: '', setlist: '', presetSlot: '', presetScene: '', generalNotes: '', sections: emptySections, presetMode: 'default',
    });
    setEditMode(true);
    setIsDetailsOpen(true);
    setCurrentOrder(0);
  };

  const handleAddSection = (index: number) => {
    const newSection: NoteSection = { id: `section-${Date.now()}-${Math.random()}`, type: 'Verse', text: '', chords: [] };
    const newSections = [...sections];
    newSections.splice(index, 0, newSection);
    setSections(newSections);
  };

  const handleDeleteSection = (id: string) => {
    const index = sections.findIndex(s => s.id === id);
    if (index < 0) return;
    const removed = sections[index];
    setSections(prev => prev.filter(s => s.id !== id));
    toast({
      title: `Sezione ${removed.type} rimossa`,
      action: (
        <ToastAction altText="Annulla la rimozione" onClick={() => setSections(prev => insertAt(prev, index, removed))}>
          Annulla
        </ToastAction>
      ),
    });
  };

  const handleDuplicateSection = (id: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex === -1) return;
    
    const sectionToDuplicate = sections[sectionIndex];
    const duplicatedSection: NoteSection = {
      ...sectionToDuplicate,
      id: `duplicated-${Date.now()}-${Math.random()}`,
      chords: [...(sectionToDuplicate.chords || [])]
    };
    
    const newSections = [...sections];
    newSections.splice(sectionIndex + 1, 0, duplicatedSection);
    setSections(newSections);
  };

  const handleMoveSectionUp = (id: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex <= 0) return;
    
    const newSections = [...sections];
    [newSections[sectionIndex - 1], newSections[sectionIndex]] = [newSections[sectionIndex], newSections[sectionIndex - 1]];
    setSections(newSections);
  };

  const handleMoveSectionDown = (id: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex === -1 || sectionIndex >= sections.length - 1) return;
    
    const newSections = [...sections];
    [newSections[sectionIndex], newSections[sectionIndex + 1]] = [newSections[sectionIndex + 1], newSections[sectionIndex]];
    setSections(newSections);
  };

  // Aggiornamenti funzionali: più scelte di fila dallo stesso selettore non perdono accordi.
  const insertChord = (sectionId: string, index: number, chord: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, chords: insertAt(s.chords || [], index, chord) } : s));
  };

  // M2: rimozione immediata con "Annulla" nel messaggio, al posto della conferma.
  const removeChord = (sectionId: string, index: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const { removed } = removeAt(section.chords || [], index);
    if (removed === undefined) return;
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, chords: removeAt(s.chords || [], index).list } : s));
    const isNewline = removed.trim().toUpperCase() === 'NEWLINE';
    toast({
      title: isNewline ? 'A capo rimosso' : `Accordo ${removed} rimosso`,
      action: (
        <ToastAction altText="Annulla la rimozione" onClick={() => setSections(prev => prev.map(s => s.id === sectionId ? { ...s, chords: insertAt(s.chords || [], index, removed) } : s))}>
          Annulla
        </ToastAction>
      ),
    });
  };

  // Bozza attuale come nota: "Crea versione" in modifica parte da qui, non dall'ultimo salvataggio.
  const draftNote = (): SavedNote => ({
    ...(cachedNote as SavedNote),
    title,
    generalNotes,
    sections,
    ...(editsPlaylistPreset ? {} : { presetSlot: selectedPresetSlot, presetScene: selectedPresetScene }),
  });

  // Preset mostrato nel chip: nel modello a playlist è quello effettivo (playlist o brano).
  const chipPreset = isPlaylistModel && cachedNote
    ? effectivePreset(cachedNote, playlistItem)
    : { presetSlot: selectedPresetSlot, presetScene: selectedPresetScene };
  const defaultPresetLabel = cachedNote?.presetSlot
    ? formatPresetLabel(formatSlotLabel(Number(cachedNote.presetSlot)), cachedNote.presetScene)
    : 'nessuno';
  const showPresetSelects = !editsPlaylistPreset || presetMode === 'custom';

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-3 py-3 shadow-[0_10px_30px_-24px_hsl(var(--primary))] backdrop-blur-xl lg:px-5">
          <div className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-border/80 bg-secondary/70 text-muted-foreground shadow-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
              title="Chiudi nota"
              aria-label="Chiudi nota"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>

            <div className="min-w-0">
              <span className="flex items-center gap-2 leading-none"><span className="section-kicker whitespace-nowrap">Nota brano</span>{editMode && <SaveStatus state={saveState} className="whitespace-nowrap" />}</span>
              {editMode ? (
                <Input
                  aria-label="Titolo brano"
                  placeholder="Titolo brano..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-8 border-none bg-transparent p-0 text-xl font-bold leading-tight text-foreground shadow-none focus-visible:ring-0 lg:text-2xl"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className="mt-1 flex max-w-full items-center gap-1.5 text-left text-xl font-bold leading-tight text-foreground transition-colors hover:text-primary lg:text-2xl"
                  aria-expanded={isDetailsOpen}
                  title="Mostra dettagli brano"
                >
                  <span className="line-clamp-2 break-words" title={title || undefined}>{isNoteMissing ? "Nota non trovata" : (title || "Scegli un brano...")}</span>
                  {noteId && (isDetailsOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />)}
                </button>
              )}
              {!editMode && noteId && !isNoteMissing && chipPreset.presetSlot && (() => {
                const chip = getPresetChipState({ connected: status === 'connected', sent: presetSent });
                const label = formatPresetLabel(formatSlotLabel(Number(chipPreset.presetSlot)), chipPreset.presetScene);
                return (
                  <button
                    type="button"
                    onClick={() => sendNotePreset(chipPreset.presetSlot, chipPreset.presetScene)}
                    disabled={status !== 'connected'}
                    aria-label={`Preset ${label}: ${status === 'connected' ? chip.text : 'pedaliera non collegata'}. Tocca per inviarlo alla pedaliera`}
                    className={cn(
                      'mt-2 inline-flex min-h-8 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-caption font-semibold transition-colors disabled:cursor-not-allowed',
                      chip.tone === 'success' ? 'border-success/50 text-success' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', chip.tone === 'success' ? 'bg-success' : 'bg-muted-foreground')} />
                    <span className="font-bold">{label}</span> · {chip.text}
                  </button>
                );
              })()}
            </div>

            <div className="flex items-center gap-2">
              {!editMode && noteId && !isNoteMissing && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-secondary/70 text-muted-foreground shadow-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
                  title="Modifica nota"
                  aria-label="Modifica nota"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
              {!editMode && noteId && !isNoteMissing && (
                <NoteReadMenu showAutoSend onStartLive={onStartLive}>
                  {isPlaylistModel && cachedNote && (
                    <>
                      <DropdownMenuSeparator />
                      {onAddToPlaylists && (
                        <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => onAddToPlaylists(cachedNote)}>
                          <ListPlus className="h-4 w-4" aria-hidden="true" /> Aggiungi a playlist…
                        </DropdownMenuItem>
                      )}
                      {onCreateVersion && (
                        <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => onCreateVersion(cachedNote)}>
                          <CopyPlus className="h-4 w-4" aria-hidden="true" /> Crea versione
                        </DropdownMenuItem>
                      )}
                      {onDeleteNote && (
                        <DropdownMenuItem className="min-h-11 gap-2 text-destructive" onSelect={() => onDeleteNote(cachedNote)}>
                          <TrashIcon className="h-4 w-4" aria-hidden="true" /> Elimina brano
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </NoteReadMenu>
              )}
              {editMode && (
                <>
                  <button
                    type="button"
                    onClick={() => (isDirty ? setPendingExit('cancel') : discardChanges())}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-secondary/70 text-muted-foreground shadow-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                    title="Annulla modifiche"
                    aria-label="Annulla modifiche"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:opacity-60"
                    title="Salva nota"
                    aria-label="Salva nota"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {isNoteMissing ? (
          <div role="status" className="mx-4 rounded-xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Nota non disponibile su questo dispositivo</p>
            <p className="mt-1">Attendi il caricamento delle note oppure chiudi e riaprila dall'elenco.</p>
          </div>
        ) : (
        <div className="space-y-6">
          {editMode && sharedIn.length >= 2 && cachedNote && (
            <div role="note" className="mx-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <span className="font-semibold text-warning">Questo brano è in {sharedIn.length} playlist: le modifiche valgono per tutte.</span>
              {onCreateVersion && (
                <button type="button" onClick={() => onCreateVersion(draftNote(), { fromDraft: isDirty })} className="min-h-11 font-bold text-primary underline-offset-4 hover:underline">
                  Crea versione
                </button>
              )}
            </div>
          )}
          {(editMode || isDetailsOpen) && (
            <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50">
              {editsPlaylistPreset && (
                <fieldset className="space-y-2">
                  <legend className="text-caption uppercase font-black text-muted-foreground tracking-tighter">Preset in «{playlist?.name}»</legend>
                  <div role="radiogroup" aria-label={`Preset in ${playlist?.name}`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {([
                      ['default', `Predefinito del brano: ${defaultPresetLabel}`],
                      ['custom', 'Preset proprio'],
                      ['none', 'Nessun preset'],
                    ] as const).map(([value, text]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={presetMode === value}
                        disabled={!editMode}
                        onClick={() => setPresetMode(value)}
                        className={cn('min-h-11 rounded-lg border px-3 text-left text-body-sm font-semibold transition-colors disabled:cursor-default',
                          presetMode === value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40')}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {showPresetSelects && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <label className="text-caption uppercase font-black text-muted-foreground tracking-tighter">{isPlaylistModel && !editsPlaylistPreset ? 'Preset predefinito del brano' : 'Hardware Preset'}</label>
                  <Select value={selectedPresetSlot} onValueChange={(val) => { setSelectedPresetSlot(val); if (status === 'connected') sendProgramChange(parseInt(val)-1); }} disabled={!editMode}>
                    <SelectTrigger aria-label="Preset della pedaliera (slot)" className="h-11 bg-background/50 border-border font-mono text-body-sm"><SelectValue placeholder="Collega a Slot MG-30" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-2 pb-2 pt-1">
                        <Input 
                          placeholder="Cerca Slot (es: 12A)..." 
                          value={presetSearch} 
                          onChange={(e) => setPresetSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="h-8 text-xs mb-2"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-[240px]">
                        {filteredPresets.length > 0 ? (
                          filteredPresets.map((p) => {
                            const label = formatSlotLabel(p.slot);
                            return (
                              <SelectItem key={`preset-opt-${p.slot}`} value={p.slot.toString()}>
                                <span className="font-bold mr-2">{label}:</span> {p.name}
                              </SelectItem>
                            );
                          })
                        ) : (
                          <div className="py-2 text-center text-xs text-muted-foreground">Nessun preset trovato</div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-caption uppercase font-black text-muted-foreground tracking-tighter">Scena</label>
                  <Select 
                    value={selectedPresetScene} 
                    onValueChange={(val) => { setSelectedPresetScene(val); if (status === 'connected') sendSceneChange(parseInt(val)); }} 
                    disabled={!editMode || !selectedPresetSlot}
                  >
                    <SelectTrigger aria-label="Scena del preset" className={cn(
                      "h-11 bg-background/50 border-border font-mono text-body-sm",
                      (!selectedPresetSlot) && "opacity-50 cursor-not-allowed"
                    )}>
                      <SelectValue placeholder="S1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">SCENE 1</SelectItem>
                      <SelectItem value="1">SCENE 2</SelectItem>
                      <SelectItem value="2">SCENE 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}
              {!isPlaylistModel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-caption uppercase font-black text-muted-foreground tracking-tighter">Band</label>
                  <Select value={band} onValueChange={setBand} disabled={!editMode}>
                    <SelectTrigger aria-label="Band" className="h-11 text-[14px] bg-background/50 border-border">
                      <SelectValue placeholder="Scegli Band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="band-empty" value="Senza Band">Senza Band</SelectItem>
                      {uniqueBands.filter(b => b !== 'Senza Band').map(b => (
                        <SelectItem key={`band-opt-${b}`} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-caption uppercase font-black text-muted-foreground tracking-tighter">Scaletta</label>
                  <Select value={setlist} onValueChange={setSetlist} disabled={!editMode}>
                    <SelectTrigger aria-label="Scaletta" className="h-11 text-[14px] bg-background/50 border-border">
                      <SelectValue placeholder="Scegli Scaletta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="setlist-empty" value="Senza Scaletta">Senza Scaletta</SelectItem>
                      {uniqueSetlists.filter(s => s !== 'Senza Scaletta').map(s => (
                        <SelectItem key={`set-opt-${s}`} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}
            </div>
          )}

          {editMode || (generalNotes && generalNotes.trim() !== '...') ? (
            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <button className="w-full justify-between h-10 text-caption font-black uppercase tracking-widest bg-secondary/30 rounded-xl px-4 border border-border/30 flex items-center">
                  <span>Note Generali</span>
                  {isNotesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea 
                  placeholder="..." 
                  className={cn("min-h-[140px] bg-card/30 border-border/50 resize-none leading-relaxed p-4", editMode ? "text-[16px]" : "text-[length:calc(16px*var(--note-scale,1))]")}
                  value={generalNotes} 
                  onChange={(e) => setGeneralNotes(e.target.value)} 
                  readOnly={!editMode} 
                />
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          <Card className="border-border shadow-xl bg-card/40 rounded-2xl overflow-hidden">
            {editMode && (
              <CardHeader className="py-3 bg-secondary/40 flex flex-row items-center justify-between px-5 border-b border-border/40">
                <CardTitle className="text-[12px] uppercase tracking-widest font-black text-primary flex items-center gap-2"><Layers className="w-5 h-5" /> Struttura Brano</CardTitle>
                <button onClick={() => handleAddSection(sections.length)} className="h-9 text-caption font-bold bg-background/50 border px-3 rounded flex items-center gap-2"><Plus className="w-4 h-4 mr-1" /> Sezione</button>
              </CardHeader>
            )}
            <CardContent className="p-0">
              <div className="flex flex-col">
                {sections.map((section, sIdx) => (
                  <React.Fragment key={section.id}>
                    {editMode && sIdx === 0 && (
                      <div className="flex items-center justify-center py-1">
                        <button onClick={() => handleAddSection(0)} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-caption font-bold uppercase text-primary hover:bg-primary/10">
                          <Plus className="w-4 h-4" /> Inserisci Sezione
                        </button>
                      </div>
                    )}
                    <div className="flex items-start border-b border-border/20 last:border-0 hover:bg-secondary/5 transition-colors">
                      <div className="p-3 w-[85px] shrink-0 align-top">
                        {editMode ? (
                          <Select
                            value={section.type}
                            onValueChange={(val: SectionType) => setSections(sections.map(s => s.id === section.id ? { ...s, type: val } : s))}
                          >
                            <SelectTrigger aria-label={`Tipo della sezione ${sIdx + 1}`} className={cn(
                              "w-full h-9 text-[12px] font-black uppercase border p-1",
                              SECTION_COLORS[section.type as SectionType]?.bg,
                              SECTION_COLORS[section.type as SectionType]?.text,
                              SECTION_COLORS[section.type as SectionType]?.border
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"].map(t => (
                                <SelectItem key={t} value={t} className="text-caption font-bold uppercase">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "w-full justify-center h-9 text-body-sm font-black uppercase tracking-tighter border",
                              SECTION_COLORS[section.type as SectionType]?.bg,
                              SECTION_COLORS[section.type as SectionType]?.text,
                              SECTION_COLORS[section.type as SectionType]?.border
                            )}
                          >
                            {section.type}
                          </Badge>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {editMode && (
                            <ChordInsertPopover
                              label="Inserisci accordo all'inizio"
                              startIndex={0}
                              onInsert={(chord, index) => insertChord(section.id, index, chord)}
                            />
                          )}
                          {(section.chords || []).map((chord, cIdx) => (
                            chord.trim().toUpperCase() === "NEWLINE" ? (
                              <div key={`${section.id}-${cIdx}`} className={cn("basis-full flex items-center gap-2", editMode ? "min-h-11" : "h-4")}>
                                {editMode && (
                                  <>
                                    <div className="flex-1 border-t border-dashed border-primary/30" />
                                    <IconButton label="Rimuovi a capo" className="text-destructive" onClick={() => removeChord(section.id, cIdx)}>
                                      <X className="h-4 w-4" />
                                    </IconButton>
                                  </>
                                )}
                              </div>
                            ) : (
                              <ChordChip
                                key={`${section.id}-${cIdx}`}
                                chord={chord}
                                editMode={editMode}
                                className={cn(
                                  "text-[length:calc(20px*var(--note-scale,1))]",
                                  /^x\d+$/i.test(chord.trim())
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : [SECTION_COLORS[section.type as SectionType]?.bg, SECTION_COLORS[section.type as SectionType]?.border, SECTION_COLORS[section.type as SectionType]?.text]
                                )}
                                onInsertAfter={(newChord, picksSoFar) => insertChord(section.id, cIdx + 1 + picksSoFar, newChord)}
                                onRemove={() => removeChord(section.id, cIdx)}
                              />
                            )
                          ))}
                        </div>
                        {editMode ? (
                          <Input 
                            value={section.text} 
                            onChange={(e) => setSections(sections.map(s => s.id === section.id ? { ...s, text: e.target.value } : s))} 
                            placeholder="Note blocco..." 
                            className="h-9 text-[16px] font-semibold border-none bg-transparent p-0 italic text-muted-foreground focus-visible:ring-0 shadow-none" 
                          />
                        ) : (
                          <p className="text-[length:calc(16px*var(--note-scale,1))] font-semibold leading-snug whitespace-pre-wrap">{section.text}</p>
                        )}
                      </div>
                      {editMode && (
                        <div className="p-3 w-auto flex items-center justify-center align-top gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton label="Opzioni sezione" className="text-muted-foreground hover:text-primary">
                                <MoreVertical className="w-5 h-5" />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDuplicateSection(section.id)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplica
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveSectionUp(section.id)} disabled={sIdx === 0}>
                                <ArrowUp className="w-4 h-4 mr-2" />
                                Sposta su
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveSectionDown(section.id)} disabled={sIdx === sections.length - 1}>
                                <ArrowDown className="w-4 h-4 mr-2" />
                                Sposta giù
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteSection(section.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <div className="relative flex items-center justify-center py-1">
                        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-primary/5 -translate-y-1/2" />
                        <button onClick={() => handleAddSection(sIdx + 1)} className="relative z-10 flex min-h-11 items-center gap-2 rounded-full border border-primary/20 bg-background px-3 text-caption font-bold uppercase text-primary hover:bg-primary/10">
                          <Plus className="w-3.5 h-3.5" /> Inserisci Sezione Qui
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        <AlertDialog open={pendingExit !== null} onOpenChange={(open) => { if (!open) setPendingExit(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Uscire senza salvare?</AlertDialogTitle>
              <AlertDialogDescription>
                Le modifiche a questa nota non sono state salvate e andranno perse.
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
    </>
  );
}
