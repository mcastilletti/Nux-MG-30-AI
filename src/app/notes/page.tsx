"use client"

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotebookPen, Plus, Trash2, GripVertical, Music2, Layers, Printer, Copy, ArrowRight } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NoteSheet } from '@/components/notes/NoteSheet';
import { NoteEditorContent } from '@/components/notes/NoteEditorContent';
import { useNotesCache } from '@/stores/use-notes-cache';

export interface NoteSection {
  id: string;
  type: string;
  text: string;
  chords?: string[];
}

export interface SavedNote {
  id: string;
  title: string;
  band: string;
  setlist: string;
  generalNotes?: string;
  sections?: NoteSection[];
  presetSlot?: string;
  presetScene?: string;
  order?: number;
  updatedAt?: any;
  userId?: string;
}

const FILTER_BAND_KEY = 'mg30_notes_filter_band';
const FILTER_SETLIST_KEY = 'mg30_notes_filter_setlist';

function NotesLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading: userLoading } = useUser();
  const { notes: cachedNotes, setNotes, isLoading: cacheLoading, updateNote, addNote, deleteNote } = useNotesCache();
  
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<string | null>(null);
  const noteRefs = useRef<Record<string, HTMLDivElement>>({});

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [noteToCopy, setNoteToCopy] = useState<SavedNote | null>(null);
  const [copyStep, setCopyStep] = useState(1);
  const [targetBand, setTargetBand] = useState('');
  const [targetSetlist, setTargetSetlist] = useState('');
  const [newSetlistName, setNewSetlistName] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<SavedNote | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const scrollToId = searchParams.get('scrollTo');

  useEffect(() => {
    if (scrollToId) {
      setSelectedNoteId(scrollToId);
    }
  }, [scrollToId]);

  useEffect(() => {
    const savedBand = localStorage.getItem(FILTER_BAND_KEY);
    const savedSetlist = localStorage.getItem(FILTER_SETLIST_KEY);
    if (savedBand && savedBand !== 'all') setSelectedBand(savedBand);
    if (savedSetlist && savedSetlist !== 'all') setSelectedSetlist(savedSetlist);
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTER_BAND_KEY, selectedBand || 'all');
  }, [selectedBand]);

  useEffect(() => {
    localStorage.setItem(FILTER_SETLIST_KEY, selectedSetlist || 'all');
  }, [selectedSetlist]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (userLoading || !user) return;

    // Check if we have cached data that's recent (less than 10 minutes old)
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();
    const lastUpdated = useNotesCache.getState().lastUpdated;
    
    if (cachedNotes.length > 0 && lastUpdated && (now - lastUpdated) < CACHE_TTL) {
      // Use cached data
      return;
    }

    // Load from Firestore
    const loadNotes = async () => {
      try {
        const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
        const sorted = notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setNotes(sorted);
      } catch (error) {
        console.error('Error loading notes:', error);
        toast({ title: "Errore caricamento note", variant: "destructive" });
      }
    };

    loadNotes();
  }, [user, userLoading, firestore, cachedNotes.length, setNotes]);

  const filteredNotes = useMemo(() => {
    let notesToFilter = [...cachedNotes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (selectedBand) notesToFilter = notesToFilter.filter(n => n.band === selectedBand);
    if (selectedSetlist) notesToFilter = notesToFilter.filter(n => n.setlist === selectedSetlist);
    return notesToFilter;
  }, [cachedNotes, selectedBand, selectedSetlist]);

  useEffect(() => {
    if (scrollToId && filteredNotes.length > 0) {
        const timer = setTimeout(() => {
            const element = noteRefs.current[scrollToId];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 200); 
        return () => clearTimeout(timer);
    }
  }, [filteredNotes, scrollToId]);

  const bands = useMemo(() => {
    const unique = [...new Set(cachedNotes.map(n => n.band || 'Senza Band'))];
    return unique.sort();
  }, [cachedNotes]);

  const setlists = useMemo(() => {
    if (!selectedBand) return [];
    const unique = [...new Set(cachedNotes.filter(n => n.band === selectedBand).map(n => n.setlist || 'Senza Scaletta'))];
    return unique.sort();
  }, [cachedNotes, selectedBand]);

  const setlistsForCopy = useMemo(() => {
    if (!targetBand) return [];
    const unique = [...new Set(cachedNotes.filter(n => n.band === targetBand).map(n => n.setlist || 'Senza Scaletta'))];
    return unique.sort();
  }, [cachedNotes, targetBand]);


  const handleDelete = (e: React.MouseEvent, note: SavedNote) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteDoc(doc(firestore, "notes", noteToDelete.id));
      deleteNote(noteToDelete.id);
      toast({ title: "Nota eliminata" });
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (err) { toast({ title: "Errore eliminazione", variant: "destructive" }); }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const activeIndex = filteredNotes.findIndex(n => n.id === active.id);
        const overIndex = filteredNotes.findIndex(n => n.id === over.id);
        const newFilteredOrdered = arrayMove(filteredNotes, activeIndex, overIndex);
        
        const updatedNotes = [...cachedNotes];
        newFilteredOrdered.forEach((note, index) => {
            const globalIdx = updatedNotes.findIndex(n => n.id === note.id);
            if (globalIdx !== -1) updatedNotes[globalIdx] = { ...updatedNotes[globalIdx], order: index };
        });

        const sortedGlobal = updatedNotes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setNotes(sortedGlobal);
        
        const batch = writeBatch(firestore);
        newFilteredOrdered.forEach((note, index) => {
            batch.update(doc(firestore, "notes", note.id), { order: index });
        });
        batch.commit().catch(() => toast({ title: "Errore sincronizzazione ordine cloud", variant: "destructive" }));
    }
  }

  const handleExportPdf = () => {
    window.print();
  };

  const openCopyDialog = (e: React.MouseEvent, note: SavedNote) => {
    e.stopPropagation();
    setNoteToCopy(note);
    setIsCopyDialogOpen(true);
    setCopyStep(1);
    setTargetBand('');
    setTargetSetlist('');
    setNewSetlistName('');
  }

  const handleConfirmCopy = async () => {
    if (!noteToCopy || !targetBand) return;

    const destinationSetlist = newSetlistName.trim() || targetSetlist;
    if (!destinationSetlist) {
      toast({ title: "Scegli o crea una scaletta.", variant: "destructive" });
      return;
    }

    const notesInDestination = cachedNotes.filter(n => n.band === targetBand && n.setlist === destinationSetlist);
    const newOrder = notesInDestination.length > 0 ? Math.max(...notesInDestination.map(n => n.order ?? 0)) + 1 : 0;

    const { id, ...noteData } = noteToCopy;
    const newNote = {
      ...noteData,
      band: targetBand,
      setlist: destinationSetlist,
      order: newOrder,
      updatedAt: serverTimestamp(),
      userId: user?.uid,
    };

    try {
        const docRef = await addDoc(collection(firestore, "notes"), newNote);
        const createdNote = { ...newNote, id: docRef.id } as SavedNote;
        addNote(createdNote);
        toast({ title: `Brano copiato in ${targetBand} / ${destinationSetlist}` });
    } catch(e) {
        toast({ title: "Errore nella copia.", variant: "destructive" });
    }
    
    setIsCopyDialogOpen(false);
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-20 px-2 md:px-0 no-print">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <NotebookPen className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase">Archivio Note</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedSetlist && filteredNotes.length > 0 && (
              <Button onClick={handleExportPdf} variant="outline" className="gap-2 border-orange-500/30 text-orange-500 hover:bg-orange-500/10">
                <Printer className="w-4 h-4" /> Esporta PDF
              </Button>
            )}
            <Button onClick={() => { setSelectedNoteId(null); setIsSheetOpen(true); }} size="icon" className="w-11 h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-card/40 p-3 rounded-2xl border border-border shadow-sm">
          <Select value={selectedBand || 'all'} onValueChange={(v) => { setSelectedBand(v === 'all' ? null : v); setSelectedSetlist(null); }}>
            <SelectTrigger className="h-11 bg-background/50 border-border text-[14px] font-bold"><SelectValue placeholder="Tutte le band" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le band</SelectItem>
              {bands.map(band => <SelectItem key={band} value={band}>{band}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSetlist || 'all'} onValueChange={(v) => setSelectedSetlist(v === 'all' ? null : v)} disabled={!selectedBand}>
            <SelectTrigger className="h-11 bg-background/50 border-border text-[14px] font-bold"><SelectValue placeholder="Tutte le scalette" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le scalette</SelectItem>
              {setlists.map(setlist => <SelectItem key={setlist} value={setlist}>{setlist}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <Music2 className="w-12 h-12" /><h3 className="text-lg font-bold uppercase">Nessun brano</h3><p className="text-xs">Usa i filtri o aggiungi un nuovo brano</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredNotes.map((note, index) => (
                    <SortableNoteCard 
                      key={note.id} 
                      note={note} 
                      onDelete={(e) => handleDelete(e, note)} 
                      onCopy={(e) => openCopyDialog(e, note)}
                      onClick={() => { setSelectedNoteId(note.id); setIsSheetOpen(true); }}
                      ref={(el) => { if(el) noteRefs.current[note.id] = el; }}
                      isHighlighted={note.id === selectedNoteId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copia "{noteToCopy?.title}"</DialogTitle>
            <DialogDescription>Scegli band e scaletta di destinazione.</DialogDescription>
          </DialogHeader>
          {copyStep === 1 && (
              <div className="py-4 space-y-4">
                <p className="text-sm font-bold">Step 1: Scegli la Band</p>
                <Select value={targetBand} onValueChange={setTargetBand}>
                    <SelectTrigger className="h-11 text-[14px]"><SelectValue placeholder="Scegli band..." /></SelectTrigger>
                    <SelectContent>
                        {bands.map(b => <SelectItem key={`cb-${b}`} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
          )}
          {copyStep === 2 && (
               <div className="py-4 space-y-4">
                 <p className="text-sm font-bold">Step 2: Scegli o crea una Scaletta</p>
                <Select value={targetSetlist} onValueChange={setTargetSetlist}>
                    <SelectTrigger className="h-11 text-[14px]"><SelectValue placeholder="Scegli scaletta..." /></SelectTrigger>
                    <SelectContent>
                        {setlistsForCopy.map(s => <SelectItem key={`cs-${s}`} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border"/>
                    <p className="text-xs text-muted-foreground uppercase">oppure</p>
                    <div className="flex-1 h-px bg-border"/>
                </div>
                <Input 
                    placeholder="Crea nuova scaletta..."
                    value={newSetlistName}
                    onChange={(e) => setNewSetlistName(e.target.value)}
                />
              </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>Annulla</Button>
            {copyStep === 1 && <Button onClick={() => setCopyStep(2)} disabled={!targetBand}>Avanti <ArrowRight className="w-4 h-4 ml-2"/></Button>}
            {copyStep === 2 && <Button onClick={handleConfirmCopy}>Conferma Copia</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina "{noteToDelete?.title}"</DialogTitle>
            <DialogDescription>Sei sicuro di voler eliminare questo brano? Questa azione non può essere annullata.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden print:block print-only">
        {filteredNotes.map((note) => (
          <div key={`print-${note.id}`} className="print-song-page">
            <h1 className="print-title">{note.title}</h1>
            
            <div className="print-subtitle">
               <span>{note.band} - {note.setlist}</span>
               {note.presetSlot && (
                 <span>PRESET MG-30: {note.presetSlot} {note.presetScene ? `(S${parseInt(note.presetScene) + 1})` : ''}</span>
               )}
            </div>

            {note.generalNotes && (
              <div className="print-general-notes">
                {note.generalNotes}
              </div>
            )}

            <div className="print-sections-container">
              {note.sections?.map((section, sIdx) => (
                <div key={`${note.id}-s-${sIdx}`} className="print-section-row">
                  <div className="shrink-0">
                    <span className="print-section-badge">{section.type}</span>
                  </div>
                  <div className="flex-1">
                    <div className="print-chord-container">
                      {section.chords?.map((chord, cIdx) => (
                        chord.toUpperCase() === 'NEWLINE' ? (
                          <div key={`nl-${cIdx}`} className="basis-full" />
                        ) : (
                          <span key={`c-${cIdx}`} className="print-chord">{chord}</span>
                        )
                      ))}
                    </div>
                    {section.text && <p className="print-text">{section.text}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <NoteSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} disableGestures={isEditing}>
        <NoteEditorContent 
          noteId={selectedNoteId} 
          onClose={() => setIsSheetOpen(false)} 
          onEditModeChange={setIsEditing}
          onUpdate={(note: SavedNote) => {
            if (selectedNoteId) {
              updateNote(note);
            } else {
              addNote(note);
              setSelectedNoteId(note.id);
            }
          }} 
        />
      </NoteSheet>
    </AppShell>
  );
}

const SortableNoteCard = React.memo(React.forwardRef<HTMLDivElement, { 
  note: SavedNote; 
  onDelete: (e: React.MouseEvent) => void; 
  onCopy: (e: React.MouseEvent, note: SavedNote) => void; 
  onClick: () => void; 
  isHighlighted?: boolean;
}>(({ note, onDelete, onCopy, onClick, isHighlighted }, ref) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, opacity: isDragging ? 0.6 : 1 };

  const combinedRef = (el: HTMLDivElement) => {
    setNodeRef(el);
    if (ref) {
      if (typeof ref === 'function') {
        ref(el);
      } else {
        ref.current = el;
      }
    }
  };

  return (
    <div ref={combinedRef} style={style} onClick={onClick}>
       <Card className={cn(
         "group relative flex items-center pl-1 pr-4 py-4 hover:border-orange-500/50 transition-all cursor-pointer bg-card/60 border-border overflow-hidden", 
         isDragging && "shadow-2xl shadow-orange-500/30 border-orange-500/50",
         isHighlighted && "ring-2 ring-orange-500 border-orange-500 shadow-lg shadow-orange-500/20 bg-orange-500/5"
       )}>
        <div {...attributes} {...listeners} className="px-1 text-muted-foreground/30 hover:text-orange-500 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center h-full" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pl-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[16px] font-black uppercase leading-tight whitespace-pre-wrap">{note.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0 no-print">
               <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-500 opacity-30 group-hover:opacity-100 transition-opacity" onClick={(e) => onCopy(e, note)}><Copy className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{note.band}</span>
            <span className="text-[10px] text-muted-foreground opacity-30">•</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{note.setlist}</span>
            {note.presetSlot && (
              <>
                <span className="text-[10px] text-muted-foreground opacity-30">•</span>
                <span className="text-[10px] text-orange-500 uppercase font-bold">
                  {(() => {
                    const s = parseInt(note.presetSlot);
                    const bank = Math.floor((s - 1) / 4) + 1;
                    const sub = ['A', 'B', 'C', 'D'][(s - 1) % 4];
                    return `${String(bank).padStart(2, '0')}${sub}`;
                  })()}
                  {note.presetScene && ` S${parseInt(note.presetScene) + 1}`}
                </span>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}));

SortableNoteCard.displayName = 'SortableNoteCard';

export default function NotesLibraryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Layers className="w-10 h-10 animate-spin text-primary" /></div>}>
            <NotesLibraryContent />
        </Suspense>
    );
}