
"use client"

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useMidiStore } from '@/stores/use-midi-store';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Layers, Pencil, X, FileJson, ArrowLeft, PlusCircle, CornerDownLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getChordPositions } from '@/lib/chord-data';

type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

interface NoteSection {
  id: string;
  type: SectionType;
  text: string;
  chords?: string[];
}

interface SavedNote {
  id: string;
  title: string;
  band: string;
  setlist: string;
  presetSlot: string;
  generalNotes: string;
  sections: NoteSection[];
  order?: number;
  date?: any;
  userId?: string;
  updatedAt?: any;
}

const CHORD_ROOTS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const CHORD_TABLE: Record<string, string[]> = {
  "C": ["C", "Cm", "C7", "Cmaj7", "Cm7", "C/B", "C/Bb", "C/G", "C/E", "C aum", "Cdim", "Csus4", "Csus2", "Cadd9"],
  "C#": ["C#", "C#m", "C#m/B", "C#7", "C#maj7", "C#m7", "C# aum", "C#dim", "C#sus4", "C#sus2", "C#add9"],
  "Db": ["Db", "Dbm", "Db7", "Dbmaj7", "Dbm7", "Db aum", "Dbdim", "Dbsus4", "Dbsus2", "Dbmadd9"],
  "D": ["D", "D5", "Dm", "D7", "Dmaj7", "Dm7", "D/C", "D/B", "D/A", "D/F#", "Dm/C", "Dm/Bb", "D aum", "Ddim", "Dsus4", "Dsus2", "Dadd9"],
  "D#": ["D#", "D#m", "D#7", "D#maj7", "D#m7", "D# aum", "D#dim", "D#sus4", "D#sus2", "D#add9"],
  "Eb": ["Eb", "Ebm", "Eb7", "Ebmaj7", "Ebm7", "Eb aum", "Ebdim", "Ebsus4", "Ebsus2", "Ebadd9"],
  "E": ["E", "Em", "E7", "Emaj7", "Em7", "E/D", "E/G#", "E/F#", "E aum", "Edim", "Esus4", "Esus2", "Eadd9"],
  "F": ["F", "Fm", "F7", "Fmaj7", "Fm7", "F/E", "F/G", "F aum", "Fdim", "Fsus4", "Fsus2", "Fadd9"],
  "F#": ["F#", "F#m", "F#m/E", "F#7", "F#maj7", "F#m7", "F# aum", "F#dim", "F#sus4", "F#sus2", "F#add9"],
  "Gb": ["Gb", "Gbm", "Gb7", "Gbmaj7", "Gbm7", "Gb aum", "Gbdim", "Gbsus4", "Gbsus2", "Gbadd9"],
  "G": ["G", "Gm", "G7", "Gmaj7", "Gm7", "G/F#", "G/F", "G/E", "G/D", "G/B", "G aum", "Gdim", "Gsus4", "Gsus2", "Gadd9"],
  "G#": ["G#", "G#m", "G#7", "G#maj7", "G#m7", "G# aum", "G#dim", "G#sus4", "G#sus2", "G#add9"],
  "Ab": ["Ab", "Abm", "Ab7", "Abmaj7", "Abm7", "Ab aum", "Abdim", "Absus4", "Absus2", "Abadd9"],
  "A": ["A", "Am", "A7", "Amaj7", "Am7", "A/G", "A/F#", "A/E", "A/C#", "Am/G", "Am/F#", "Am/F", "A aum", "Adim", "Asus4", "Asus2", "Aadd9"],
  "A#": ["A#", "A#m", "A#7", "A#maj7", "A#m7", "A# aum", "A#dim", "A#sus4", "A#sus2", "A#add9"],
  "Bb": ["Bb", "Bbm", "Bb7", "Bbmaj7", "Bbm7", "Bb aum", "Bbdim", "Bbsus4", "Bbsus2", "Bbmadd9"],
  "B": ["B", "Bm", "B7", "B7/A", "Bmaj7", "Bm7", "B/A", "B aum", "Bdim", "Bsus4", "Bsus2", "Badd9"],
};

function NoteEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteIdFromUrl = searchParams.get('id');
  
  const { devicePresets, status, sendProgramChange } = useMidiStore();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, loading: userLoading } = useUser();
  
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [localNotes, setLocalNotes] = useState<SavedNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(noteIdFromUrl);
  
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); 
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [currentOrder, setCurrentOrder] = useState<number>(0);

  const [isPasteJsonDialogOpen, setIsPasteJsonDialogOpen] = useState(false);
  const [jsonToPaste, setJsonToPaste] = useState('');
  const [chordPickerStep, setChordPickerStep] = useState<'letter' | 'accidental' | 'quality'>('letter');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

  const [isNewEntryDialogOpen, setIsNewEntryDialogOpen] = useState(false);
  const [newEntryType, setNewEntryType] = useState<'band' | 'setlist'>('band');
  const [newEntryValue, setNewEntryValue] = useState('');

  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!noteIdFromUrl) {
      handleNewNote();
    }
  }, [noteIdFromUrl]);

  useEffect(() => {
    const stored = localStorage.getItem('mg30_studio_notes');
    let localParsed: SavedNote[] = [];
    if (stored) {
      try {
        localParsed = JSON.parse(stored);
        setLocalNotes(localParsed);
      } catch (e) {
        console.error(e);
      }
    }

    if (userLoading) return;

    const isMockUser = user?.uid === 'dev-user-123';
    if (!user || isMockUser) {
      setSavedNotes(localParsed);
      if (noteIdFromUrl) {
        const note = localParsed.find(n => n.id === noteIdFromUrl);
        if (note) loadNote(note);
      }
      return;
    }

    const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
      setSavedNotes(notes);
      
      if (noteIdFromUrl) {
        const note = notes.find(n => n.id === noteIdFromUrl);
        if (note) loadNote(note);
      }
    });

    return () => unsubscribe();
  }, [user, userLoading, firestore, noteIdFromUrl]);

  const uniqueBands = useMemo(() => {
    const bands = new Set(savedNotes.map(n => n.band).filter(Boolean));
    if (band && !bands.has(band)) bands.add(band);
    return Array.from(bands).sort();
  }, [savedNotes, band]);

  const uniqueSetlists = useMemo(() => {
    const setlists = new Set(
      savedNotes
        .filter(n => n.band === band)
        .map(n => n.setlist)
        .filter(Boolean)
    );
    if (setlist && !setlists.has(setlist)) setlists.add(setlist);
    return Array.from(setlists).sort();
  }, [savedNotes, band, setlist]);

  const loadNote = (note: SavedNote) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setBand(note.band);
    setSetlist(note.setlist);
    setSelectedPresetSlot(note.presetSlot || '');
    setGeneralNotes(note.generalNotes || '');
    setCurrentOrder(note.order ?? 0);
    setSections((note.sections || []).map((s, idx) => ({ 
      ...s, 
      id: s.id || `loaded-${idx}-${Date.now()}-${Math.random()}`,
      chords: s.chords || [] 
    })));
    setEditMode(false);
    setIsNotesOpen(true);
    if (note.presetSlot && status === 'connected') sendProgramChange(parseInt(note.presetSlot) - 1);
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
      return;
    }

    const isMockUser = user?.uid === 'dev-user-123';
    
    let orderToSave = currentOrder;
    if (!selectedNoteId) {
      const sameSetNotes = savedNotes.filter(n => n.band === band && n.setlist === setlist);
      orderToSave = sameSetNotes.length > 0 ? Math.max(...sameSetNotes.map(n => n.order ?? 0)) + 1 : 0;
    }

    const noteData = {
      title,
      band: band || 'Senza Band',
      setlist: setlist || 'Senza Scaletta',
      presetSlot: selectedPresetSlot,
      generalNotes,
      sections,
      order: orderToSave,
      updatedAt: (user && !isMockUser) ? serverTimestamp() : new Date().toISOString(),
      userId: user?.uid || 'local-dev-user'
    };

    if (user && !isMockUser) {
      try {
        if (selectedNoteId && !selectedNoteId.startsWith('local-')) {
          await updateDoc(doc(firestore, "notes", selectedNoteId), noteData);
        } else {
          const docRef = await addDoc(collection(firestore, "notes"), noteData);
          setSelectedNoteId(docRef.id);
        }
        setEditMode(false);
        toast({ title: "Nota Salvata nel Cloud" });
      } catch (err) {
        toast({ title: "Errore salvataggio cloud", variant: "destructive" });
      }
    } else {
      const id = selectedNoteId || `local-${Date.now()}`;
      const newNote = { ...noteData, id };
      const updatedLocalNotes = (selectedNoteId && selectedNoteId.startsWith('local-'))
        ? localNotes.map(n => n.id === id ? newNote : n)
        : [...localNotes, newNote];
      
      setLocalNotes(updatedLocalNotes);
      localStorage.setItem('mg30_studio_notes', JSON.stringify(updatedLocalNotes));
      setSavedNotes(updatedLocalNotes);
      setSelectedNoteId(id);
      setEditMode(false);
      toast({ title: "Nota Salvata Localmente" });
    }
  };

  const handleCancel = () => {
    if (selectedNoteId) {
      const original = savedNotes.find(n => n.id === selectedNoteId);
      if (original) {
        loadNote(original);
        setEditMode(false);
        toast({ title: "Modifiche Annullate", variant: "default" });
      }
    } else {
      router.push('/notes');
    }
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setTitle('');
    setBand('');
    setSetlist('');
    setSelectedPresetSlot('');
    setGeneralNotes('');
    setSections([{ id: `new-${Date.now()}-${Math.random()}`, type: 'Verse', text: '', chords: [] }]);
    setEditMode(true);
    setIsDetailsOpen(true);
    setCurrentOrder(0);
  };

  const handleAddNewEntry = () => {
    if (!newEntryValue.trim()) return;
    if (newEntryType === 'band') {
      setBand(newEntryValue.trim());
    } else {
      setSetlist(newEntryValue.trim());
    }
    setIsNewEntryDialogOpen(false);
    setNewEntryValue('');
  };

  const handleAddSection = (index: number) => {
    const newSection: NoteSection = { id: `section-${Date.now()}-${Math.random()}`, type: 'Verse', text: '', chords: [] };
    const newSections = [...sections];
    newSections.splice(index, 0, newSection);
    setSections(newSections);
  };

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleAddChordAt = (sectionId: string, chordIndex: number, chord: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        const newChords = [...(s.chords || [])];
        newChords.splice(chordIndex, 0, chord);
        return { ...s, chords: newChords };
      }
      return s;
    }));
  };

  return (
    <AppShell>
      <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[calc(100vh-140px)]">
        <main className="flex-1 space-y-6 max-w-2xl mx-auto md:mx-0 w-full pb-20">
          <header className="flex items-center justify-between gap-4 py-4 border-b border-border/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
               <Button variant="ghost" size="icon" onClick={() => router.push(selectedNoteId ? `/notes?scrollTo=${selectedNoteId}` : '/notes')} className="h-10 w-10 rounded-full hover:bg-secondary/40">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex flex-col flex-1 min-w-0">
                {editMode ? (
                  <Input 
                    placeholder="Titolo Brano..." 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="text-xl font-black h-10 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-primary" 
                    autoFocus
                  />
                ) : (
                  <h2 onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="text-xl font-black text-primary cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2">
                    {title || "Scegli un brano..."}
                    {selectedNoteId && (isDetailsOpen ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />)}
                  </h2>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isPasteJsonDialogOpen} onOpenChange={setIsPasteJsonDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground rounded-full hover:bg-secondary/40" title="Importa JSON">
                    <FileJson className="w-7 h-7" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Importa Nota da JSON</DialogTitle><DialogDescription>Incolla qui il codice JSON.</DialogDescription></DialogHeader>
                  <Textarea value={jsonToPaste} onChange={(e) => setJsonToPaste(e.target.value)} placeholder='{"title": "...", "sections": [...]}' className="min-h-[200px] font-mono text-[13px]" />
                  <DialogFooter><Button onClick={() => {
                    try {
                      const data = JSON.parse(jsonToPaste);
                      setTitle(data.title || '');
                      setBand(data.band || '');
                      setSetlist(data.setlist || '');
                      setGeneralNotes(data.generalNotes || '');
                      setSections((data.sections || []).map((s: any, idx: number) => ({ 
                        ...s, 
                        id: s.id || `imported-${idx}-${Date.now()}-${Math.random()}`,
                        chords: s.chords || [] 
                      })));
                      setEditMode(true);
                      setIsDetailsOpen(true);
                      setIsPasteJsonDialogOpen(false);
                      setJsonToPaste('');
                      toast({ title: "JSON Importato" });
                    } catch (e) { toast({ title: "JSON non valido", variant: "destructive" }); }
                  }}>Importa</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              
              {!editMode && selectedNoteId && (
                <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} className="h-11 w-11 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary" title="Modifica">
                  <Pencil className="w-7 h-7" />
                </Button>
              )}
              {editMode && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleCancel} className="h-11 w-11 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive" title="Annulla">
                    <X className="w-7 h-7" />
                  </Button>
                  <Button onClick={handleSaveNote} size="icon" className="h-11 w-11 bg-primary shadow-lg rounded-full" title="Salva">
                    <Save className="w-7 h-7" />
                  </Button>
                </div>
              )}
            </div>
          </header>

          <div className="space-y-6">
            {(editMode || isDetailsOpen) && (
              <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Hardware Preset</label>
                  <Select value={selectedPresetSlot} onValueChange={(val) => { setSelectedPresetSlot(val); if (status === 'connected') sendProgramChange(parseInt(val)-1); }} disabled={!editMode}>
                    <SelectTrigger className="h-11 bg-background/50 border-border font-mono text-[13px]"><SelectValue placeholder="Collega a Slot MG-30" /></SelectTrigger>
                    <SelectContent>{devicePresets.map((p) => (<SelectItem key={`preset-opt-${p.slot}`} value={p.slot.toString()}>{p.slot}: {p.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Band</label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Select value={band} onValueChange={setBand} disabled={!editMode}>
                          <SelectTrigger className="h-11 text-[14px] bg-background/50 border-border">
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
                      {editMode && (
                        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 bg-background/50" onClick={() => { setNewEntryType('band'); setIsNewEntryDialogOpen(true); }}>
                          <Plus className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Scaletta</label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Select value={setlist} onValueChange={setSetlist} disabled={!editMode}>
                          <SelectTrigger className="h-11 text-[14px] bg-background/50 border-border">
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
                      {editMode && (
                        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 bg-background/50" onClick={() => { setNewEntryType('setlist'); setIsNewEntryDialogOpen(true); }}>
                          <Plus className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-10 text-[11px] font-black uppercase tracking-widest bg-secondary/30 rounded-xl px-4 border border-border/30">
                  <span>Note Generali</span>
                  {isNotesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea 
                  placeholder="..." 
                  className="min-h-[140px] text-[16px] bg-card/30 border-border/50 resize-none leading-relaxed p-4" 
                  value={generalNotes} 
                  onChange={(e) => setGeneralNotes(e.target.value)} 
                  readOnly={!editMode} 
                />
              </CollapsibleContent>
            </Collapsible>

            <Card className="border-border shadow-xl bg-card/40 rounded-2xl overflow-hidden">
              <CardHeader className="py-3 bg-secondary/40 flex flex-row items-center justify-between px-5 border-b border-border/40">
                <CardTitle className="text-[12px] uppercase tracking-widest font-black text-primary flex items-center gap-2"><Layers className="w-5 h-5" /> Struttura Brano</CardTitle>
                {editMode && (
                  <Button variant="outline" size="sm" onClick={() => handleAddSection(sections.length)} className="h-9 text-[11px] font-bold bg-background/50"><Plus className="w-4 h-4 mr-1" /> Sezione</Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {sections.map((section, sIdx) => (
                    <React.Fragment key={section.id}>
                      {editMode && sIdx === 0 && (
                        <div className="flex items-center justify-center h-8 group/insert">
                          <button onClick={() => handleAddSection(0)} className="opacity-0 group-hover/insert:opacity-100 flex items-center gap-2 text-[10px] font-bold uppercase text-primary transition-opacity">
                            <PlusCircle className="w-4 h-4" /> Inserisci Sezione
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
                              <SelectTrigger className="w-full h-9 text-[10px] font-black uppercase bg-primary/5 border-primary/20 text-primary p-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"].map(t => (
                                  <SelectItem key={t} value={t} className="text-[11px] font-bold uppercase">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="w-full justify-center h-9 text-[11px] font-black uppercase tracking-tighter bg-primary/10 text-primary border-primary/20">{section.type}</Badge>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {editMode && (
                              <Popover onOpenChange={() => { setChordPickerStep('letter'); setSelectedLetter(null); setSelectedRoot(null); }}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-dashed border-primary/20 text-primary/40 hover:text-primary hover:border-primary/50" title="Inserisci accordo all'inizio">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-4" align="start">
                                  <ChordPicker onSelect={(chord: string) => handleAddChordAt(section.id, 0, chord)} step={chordPickerStep} setStep={setChordPickerStep} selectedLetter={selectedLetter} setSelectedLetter={setSelectedLetter} selectedRoot={selectedRoot} setSelectedRoot={setSelectedRoot} />
                                </PopoverContent>
                              </Popover>
                            )}

                            {(section.chords || []).map((chord, cIdx) => (
                               chord.trim().toUpperCase() === "NEWLINE" ? (
                                <div key={`${section.id}-${cIdx}`} className="basis-full h-4 flex items-center justify-center relative group/newline">
                                  {editMode && (
                                    <>
                                      <div className="w-full border-t border-dashed border-primary/10"></div>
                                      <button
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/newline:opacity-100 bg-background rounded-full p-0.5 text-destructive transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSections(sections.map(s => s.id === section.id ? { ...s, chords: (s.chords || []).filter((_, idx) => idx !== cIdx) } : s));
                                        }}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <React.Fragment key={`${section.id}-${cIdx}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "h-9 px-3 text-[20px] font-black shadow-sm cursor-help relative group/badge",
                                        chord.startsWith('x') && chord.length <= 3 
                                          ? "bg-orange-500/10 border-orange-500/30 text-orange-500" 
                                          : "bg-background border-primary/30 text-primary"
                                      )}
                                    >
                                      {chord}
                                      {editMode && (
                                        <button 
                                          className="ml-2 opacity-30 hover:opacity-100 text-destructive transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSections(sections.map(s => s.id === section.id ? { ...s, chords: (s.chords || []).filter((_, idx) => idx !== cIdx) } : s));
                                          }}
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-3 bg-card border-primary/40">
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-bold uppercase text-primary border-b border-primary/20 pb-1">
                                        {chord.startsWith('x') ? 'Ripetizione' : 'Posizioni Chitarra'}
                                      </p>
                                      {chord.startsWith('x') ? (
                                        <p className="text-[12px] font-medium">Ripeti la sequenza {chord.substring(1)} volte.</p>
                                      ) : (
                                        <div className="space-y-1">
                                          {getChordPositions(chord)?.map((pos, pIdx) => (
                                            <div key={`${chord}-${pIdx}`} className="flex items-center gap-2 font-mono text-[12px]">
                                              <span className="text-muted-foreground w-4">{pIdx + 1}.</span>
                                              <span className="text-foreground font-bold">{pos}</span>
                                            </div>
                                          )) || <p className="text-[11px] italic opacity-60">Posizioni non trovate</p>}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                {editMode && (
                                  <Popover onOpenChange={() => { setChordPickerStep('letter'); setSelectedLetter(null); setSelectedRoot(null); }}>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-dashed border-primary/10 text-primary/20 hover:text-primary hover:border-primary/50 transition-all opacity-0 hover:opacity-100">
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4" align="center">
                                      <ChordPicker onSelect={(chord: string) => handleAddChordAt(section.id, cIdx + 1, chord)} step={chordPickerStep} setStep={setChordPickerStep} selectedLetter={selectedLetter} setSelectedLetter={setSelectedLetter} selectedRoot={selectedRoot} setSelectedRoot={setSelectedRoot} />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </React.Fragment>
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
                            <p className="text-[16px] font-semibold leading-tight whitespace-pre-wrap">{section.text}</p>
                          )}
                        </div>
                        {editMode && (
                          <div className="p-3 w-auto flex items-center justify-center align-top">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground/30 hover:text-destructive transition-colors" onClick={() => { setSectionToDelete(section.id); setIsDeleteSectionDialogOpen(true); }} title="Elimina sezione">
                              <Trash2 className="w-6 h-6" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {editMode && (
                        <div className="flex items-center justify-center h-8 group/insert relative">
                          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-primary/5 -translate-y-1/2" />
                          <button onClick={() => handleAddSection(sIdx + 1)} className="relative z-10 opacity-0 group-hover/insert:opacity-100 bg-background px-3 flex items-center gap-2 text-[10px] font-bold uppercase text-primary transition-opacity border border-primary/20 rounded-full py-1">
                            <PlusCircle className="w-3.5 h-3.5" /> Inserisci Sezione Qui
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={isNewEntryDialogOpen} onOpenChange={setIsNewEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase font-black">Aggiungi Nuova {newEntryType === 'band' ? 'Band' : 'Scaletta'}</DialogTitle>
            <DialogDescription>Inserisci il nome per aggiungerlo all'elenco delle selezioni.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder={`Nome ${newEntryType === 'band' ? 'Band' : 'Scaletta'}...`} 
              value={newEntryValue} 
              onChange={(e) => setNewEntryValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewEntryDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleAddNewEntry}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa sezione? L'azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSectionDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={() => {
              if (sectionToDelete) {
                handleDeleteSection(sectionToDelete);
              }
              setIsDeleteSectionDialogOpen(false);
              setSectionToDelete(null);
            }}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </TooltipProvider>
    </AppShell>
  );
}

function ChordPicker({ onSelect, step, setStep, selectedLetter, setSelectedLetter, selectedRoot, setSelectedRoot }: any) {
  if (step === 'letter') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Accordi (Radice)</label>
          <div className="grid grid-cols-4 gap-2">
            {["A", "B", "C", "D", "E", "F", "G"].map(l => (
              <Button key={`root-${l}`} variant="outline" onClick={() => { setSelectedLetter(l); setStep('accidental'); }} className="font-bold">{l}</Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Ripetizioni</label>
          <div className="grid grid-cols-4 gap-2">
            {["x2", "x3", "x4", "x5", "x6", "x7", "x8"].map(mult => (
              <Button key={`mult-${mult}`} variant="secondary" onClick={() => onSelect(mult)} className="font-black text-orange-500">{mult}</Button>
            ))}
          </div>
        </div>

        <Button variant="ghost" className="w-full gap-2 font-bold uppercase text-[11px] border border-dashed border-border" onClick={() => onSelect("NEWLINE")}>
          <CornerDownLeft className="w-4 h-4" /> A capo (Nuova riga)
        </Button>
      </div>
    );
  }
  if (step === 'accidental') {
    return (
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">Alterazione per {selectedLetter}</label>
        <div className="grid grid-cols-3 gap-2">
          {CHORD_ROOTS.filter(r => r.startsWith(selectedLetter!)).map(r => (
            <Button key={`acc-${r}`} variant="outline" onClick={() => { setSelectedRoot(r); setStep('quality'); }} className="font-bold">{r}</Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStep('letter')} className="text-[10px] uppercase font-bold">Indietro</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-bold uppercase text-muted-foreground">Qualità per {selectedRoot}</label>
      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
        {CHORD_TABLE[selectedRoot!]?.map((chord, i) => (
          <Button key={`quality-${chord}-${i}`} variant="outline" onClick={() => { onSelect(chord); setStep('letter'); }} className="text-xs font-bold truncate">{chord}</Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setStep('accidental')} className="text-[10px] uppercase font-bold">Indietro</Button>
    </div>
  );
}

export default function NotesEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Layers className="w-10 h-10 animate-spin text-primary" /></div>}>
      <NoteEditorContent />
    </Suspense>
  );
}
