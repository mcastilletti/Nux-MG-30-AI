"use client"

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotebookPen, Plus, Trash2, GripVertical, Music2, Layers, Printer, Copy, ArrowRight, FileText, Search, X } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NoteSheet } from '@/components/notes/NoteSheet';
import { NoteEditorContent } from '@/components/notes/NoteEditorContent';
import { BlockEditorContent } from '@/components/notes/BlockEditorContent';
import { useNotesCache } from '@/stores/use-notes-cache';

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Intro: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/40" },
  Verse: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/40" },
  Chorus: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40" },
  Bridge: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/40" },
  Strum: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/40" },
  Out: { bg: "bg-gray-500/15", text: "text-gray-300", border: "border-gray-500/40" },
  Solo: { bg: "bg-orange-500/20", text: "text-orange-500", border: "border-orange-500/40" }
};

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
  type?: 'song' | 'block';
  blockContent?: string;
}

const FILTER_BAND_KEY = 'mg30_notes_filter_band';
const FILTER_SETLIST_KEY = 'mg30_notes_filter_setlist';

function NotesLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading: userLoading } = useUser();
  const { notes: cachedNotes, setNotes, isLoading: cacheLoading, updateNote, addNote, deleteNote, getNoteById } = useNotesCache();
  
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

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newBlockInitialBand, setNewBlockInitialBand] = useState<string | null>(null);
  const [newBlockInitialSetlist, setNewBlockInitialSetlist] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SavedNote[]>([]);

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
    if (searchQuery) notesToFilter = notesToFilter.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return notesToFilter;
  }, [cachedNotes, selectedBand, selectedSetlist, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      let results = cachedNotes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));

      // Apply filters based on selected band and setlist
      if (selectedBand) {
        results = results.filter(n => n.band === selectedBand);
      }
      if (selectedSetlist) {
        results = results.filter(n => n.setlist === selectedSetlist);
      }

      results = results
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, cachedNotes, selectedBand, selectedSetlist]);

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
      <div className="max-w-7xl mx-auto space-y-8 py-8 pb-20 px-2 md:px-0 no-print">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
              <NotebookPen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase">Archivio Note</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedSetlist && filteredNotes.length > 0 && (
                <Button onClick={handleExportPdf} variant="outline" size="icon" className="h-11 w-11 border-primary/30 text-primary hover:bg-primary/10">
                <Printer className="w-5 h-5" />
              </Button>
            )}
            <Button onClick={() => setIsSearchOpen(!isSearchOpen)} variant="outline" size="icon" className="h-11 w-11 border-primary/30 text-primary hover:bg-primary/10">
              <Search className="w-5 h-5" />
            </Button>
            <Popover open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
              <PopoverTrigger asChild>
                <Button size="icon" aria-label="Aggiungi nota" className="h-11 w-11 rounded-full font-bold">
                  <Plus className="w-6 h-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 h-10"
                    onClick={() => {
                      setSelectedNoteId(null);
                      setIsSheetOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                  >
                    <NotebookPen className="w-4 h-4" />
                    Nuovo Brano
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 h-10"
                    onClick={() => {
                      setNewBlockInitialBand(selectedBand);
                      setNewBlockInitialSetlist(selectedSetlist);
                      setSelectedNoteId('new-block');
                      setIsSheetOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Nuovo Blocco
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {isSearchOpen && (
          <div className="relative bg-card/40 p-3 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cerca brano..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-background/50 border-border"
                autoFocus
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-auto">
                {searchResults.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setIsSheetOpen(true);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/20 last:border-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-primary">{note.title}</div>
                      <div className="text-xs text-muted-foreground">{note.band} - {note.setlist}</div>
                    </div>
                    {note.presetSlot && (
                      <Badge variant="outline" className="flex h-6 shrink-0 items-center gap-1.5 border-primary/20 bg-primary/10 px-2 text-[10px] font-black text-primary">
                        <span>{(() => {
                          const s = parseInt(note.presetSlot);
                          const bank = Math.floor((s - 1) / 4) + 1;
                          const sub = ['A', 'B', 'C', 'D'][(s - 1) % 4];
                          return `${String(bank).padStart(2, '0')}${sub}`;
                        })()}</span>
                        <>
                          <span className="opacity-30">•</span>
                          <span>S{note.presetScene ? parseInt(note.presetScene) + 1 : 1}</span>
                        </>
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                      index={index}
                      onDelete={(e) => handleDelete(e, note)}
                      onCopy={(e) => openCopyDialog(e, note)}
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        setIsSheetOpen(true);
                      }}
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
                    <span className={cn(
                      "print-section-badge",
                      SECTION_COLORS[section.type as keyof typeof SECTION_COLORS]?.text
                    )}>{section.type}</span>
                  </div>
                  <div className="flex-1">
                    <div className="print-chord-container">
                      {section.chords?.map((chord, cIdx) => (
                        chord.toUpperCase() === 'NEWLINE' ? (
                          <div key={`nl-${cIdx}`} className="basis-full" />
                        ) : (
                          <span key={`c-${cIdx}`} className={cn(
                            "print-chord",
                            SECTION_COLORS[section.type as keyof typeof SECTION_COLORS]?.text
                          )}>{chord}</span>
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
        {selectedNoteId === 'new-block' || (selectedNoteId && getNoteById(selectedNoteId)?.type === 'block') ? (
          <BlockEditorContent
            noteId={selectedNoteId}
            initialBand={newBlockInitialBand}
            initialSetlist={newBlockInitialSetlist}
            onClose={() => {
              setIsSheetOpen(false);
              setNewBlockInitialBand(null);
              setNewBlockInitialSetlist(null);
            }}
            onEditModeChange={setIsEditing}
            onUpdate={(note: SavedNote) => {
              if (selectedNoteId && selectedNoteId !== 'new-block') {
                updateNote(note);
              } else {
                addNote(note);
                setSelectedNoteId(note.id);
              }
            }}
          />
        ) : (
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
        )}
      </NoteSheet>
    </AppShell>
  );
}

const SortableNoteCard = React.memo(React.forwardRef<HTMLDivElement, {
  note: SavedNote;
  index: number;
  onDelete: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent, note: SavedNote) => void;
  onClick: () => void;
  isHighlighted?: boolean;
}>(({ note, index, onDelete, onCopy, onClick, isHighlighted }, ref) => {
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
         "group relative flex items-center overflow-hidden rounded-xl border-border bg-card/60 py-4 pl-1 pr-4 transition-all duration-300 hover:border-primary/50",
         note.type === 'block' && "border-primary/30 bg-primary/10 hover:border-primary/50",
         isDragging && "border-primary/50 shadow-2xl shadow-primary/30",
         isHighlighted && "border-primary bg-primary/5 shadow-lg shadow-primary/20 ring-2 ring-primary"
       )}
       style={{ animationDelay: `${index * 0.05}s` }}
       >
        <div {...attributes} {...listeners} className="flex h-full cursor-grab touch-none items-center justify-center px-1 text-muted-foreground/30 hover:text-primary active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pl-3">
          {note.type === 'block' ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="break-words text-[16px] font-black uppercase leading-tight text-primary">{note.title}</CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0 no-print">
                 <Button variant="ghost" size="icon" aria-label="Copia nota" className="h-9 w-9 text-primary opacity-30 transition-opacity group-hover:opacity-100" onClick={(e) => onCopy(e, note)}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-[16px] font-black uppercase leading-tight whitespace-pre-wrap">{note.title}</CardTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0 no-print">
                  <Button variant="ghost" size="icon" aria-label="Copia nota" className="h-9 w-9 text-primary opacity-30 transition-opacity group-hover:opacity-100" onClick={(e) => onCopy(e, note)}><Copy className="w-4 h-4" /></Button>
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
                    <span className="text-[10px] uppercase font-bold text-primary">
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
            </>
          )}
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
