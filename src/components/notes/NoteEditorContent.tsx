"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useMidiStore } from '@/stores/use-midi-store';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { NoteSection, SavedNote } from '@/app/notes/page';
import { useNotesCache } from '@/stores/use-notes-cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Layers, Pencil, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getChordPositions } from '@/lib/chord-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

const SECTION_COLORS: Record<SectionType, { bg: string; text: string; border: string }> = {
  Intro: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/40" },
  Verse: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/40" },
  Chorus: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40" },
  Bridge: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/40" },
  Strum: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/40" },
  Out: { bg: "bg-gray-500/15", text: "text-gray-300", border: "border-gray-500/40" },
  Solo: { bg: "bg-orange-500/20", text: "text-orange-500", border: "border-orange-500/40" }
};

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

interface NoteEditorContentProps {
  noteId: string | null;
  onClose: () => void;
  onUpdate: (note: SavedNote) => void;
  onEditModeChange?: (isEditing: boolean) => void;
}

function ChordPicker({ onSelect, step, setStep, selectedLetter, setSelectedLetter, selectedRoot, setSelectedRoot }: any) {
  if (step === 'letter') {
    return (
      <div className="grid grid-cols-4 gap-2">
        {CHORD_ROOTS.map(root => (
          <button
            key={root}
            onClick={() => {
              setSelectedLetter(root);
              setSelectedRoot(root);
              setStep('quality');
            }}
            className="p-2 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded"
          >
            {root}
          </button>
        ))}
      </div>
    );
  }

  if (step === 'quality' && selectedRoot) {
    const chords = CHORD_TABLE[selectedRoot] || [];
    return (
      <div className="grid grid-cols-3 gap-2">
        {chords.map(chord => (
          <button
            key={chord}
            onClick={() => onSelect(chord)}
            className="p-2 text-sm font-bold bg-primary/10 hover:bg-primary/20 text-primary rounded"
          >
            {chord}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

export function NoteEditorContent({ noteId, onClose, onUpdate, onEditModeChange }: NoteEditorContentProps) {
  const { devicePresets, status, sendProgramChange, sendSceneChange } = useMidiStore();
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

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  const [chordPickerStep, setChordPickerStep] = useState<'letter' | 'quality'>('letter');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  // Load note from cache when noteId changes
  useEffect(() => {
    if (noteId) {
      const note = getNoteById(noteId);
      if (note) {
        loadNote(note);
      }
    } else {
      handleNewNote();
    }
  }, [noteId, getNoteById]);

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
      const bank = Math.floor((p.slot - 1) / 4) + 1;
      const sub = ['A', 'B', 'C', 'D'][(p.slot - 1) % 4];
      const label = `${bank}${sub}`.toLowerCase();
      const fullLabel = `${String(bank).padStart(2, '0')}${sub}`.toLowerCase();
      
      return label.includes(search) || fullLabel.includes(search) || p.name.toLowerCase().includes(search);
    });
  }, [devicePresets, presetSearch]);

  const loadNote = (note: SavedNote) => {
    setTitle(note.title);
    setBand(note.band);
    setSetlist(note.setlist);
    setSelectedPresetSlot(note.presetSlot || '');
    setSelectedPresetScene(note.presetScene || '');
    setGeneralNotes(note.generalNotes || '');
    setCurrentOrder(note.order ?? 0);
    setSections((note.sections || []).map((s, idx) => ({ 
      ...s, 
      id: s.id || `loaded-${idx}-${Date.now()}-${Math.random()}`,
      chords: s.chords || [] 
    })));
    setEditMode(false);
    setIsNotesOpen(true);
    if (note.presetSlot && status === 'connected') {
      sendProgramChange(parseInt(note.presetSlot) - 1);
      if (note.presetScene) {
        setTimeout(() => sendSceneChange(parseInt(note.presetScene)), 500);
      }
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
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

    try {
      if (noteId) {
        await updateDoc(doc(firestore, "notes", noteId), noteData);
        onUpdate({ ...noteData, id: noteId } as SavedNote);
      } else {
        const docRef = await addDoc(collection(firestore, "notes"), noteData);
        onUpdate({ ...noteData, id: docRef.id } as SavedNote);
      }
      setEditMode(false);
      toast({ title: "Nota Salvata nel Cloud" });
    } catch (err) {
      toast({ title: "Errore salvataggio cloud", variant: "destructive" });
    }
  };

  const handleNewNote = () => {
    setTitle('');
    setBand('');
    setSetlist('');
    setSelectedPresetSlot('');
    setSelectedPresetScene('');
    setGeneralNotes('');
    setSections([{ id: `new-${Date.now()}-${Math.random()}`, type: 'Verse', text: '', chords: [] }]);
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
    <TooltipProvider>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between gap-2 lg:gap-4 py-1 lg:py-4 border-b border-border/50">
          <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
             <button onClick={onClose} className="h-9 w-9 lg:h-10 lg:w-10 rounded-full hover:bg-secondary/40 flex items-center justify-center">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
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
                  {noteId && (isDetailsOpen ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />)}
                </h2>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && noteId && (
              <button onClick={() => setEditMode(true)} className="h-9 w-9 lg:h-11 lg:w-11 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary flex items-center justify-center" title="Modifica">
                <Pencil className="w-5 h-5 lg:w-7 lg:h-7" />
              </button>
            )}
            {editMode && (
              <div className="flex items-center gap-2">
                <button onClick={() => {
                   if (noteId) {
                      const note = getNoteById(noteId);
                      if (note) loadNote(note);
                      setEditMode(false);
                   } else {
                      onClose();
                   }
                }} className="h-9 w-9 lg:h-11 lg:w-11 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center" title="Annulla">
                  <X className="w-5 h-5 lg:w-7 lg:h-7" />
                </button>
                <button onClick={handleSaveNote} className="h-9 w-9 lg:h-11 lg:w-11 bg-primary shadow-lg rounded-full flex items-center justify-center" title="Salva">
                  <Save className="w-5 h-5 lg:w-7 lg:h-7" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {(editMode || isDetailsOpen) && (
            <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Hardware Preset</label>
                  <Select value={selectedPresetSlot} onValueChange={(val) => { setSelectedPresetSlot(val); if (status === 'connected') sendProgramChange(parseInt(val)-1); }} disabled={!editMode}>
                    <SelectTrigger className="h-11 bg-background/50 border-border font-mono text-[13px]"><SelectValue placeholder="Collega a Slot MG-30" /></SelectTrigger>
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
                            const bank = Math.floor((p.slot - 1) / 4) + 1;
                            const sub = ['A', 'B', 'C', 'D'][(p.slot - 1) % 4];
                            const label = `${String(bank).padStart(2, '0')}${sub}`;
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
                  <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Scena</label>
                  <Select 
                    value={selectedPresetScene} 
                    onValueChange={(val) => { setSelectedPresetScene(val); if (status === 'connected') sendSceneChange(parseInt(val)); }} 
                    disabled={!editMode || !selectedPresetSlot}
                  >
                    <SelectTrigger className={cn(
                      "h-11 bg-background/50 border-border font-mono text-[13px]",
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Band</label>
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
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black text-muted-foreground tracking-tighter">Scaletta</label>
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
              </div>
            </div>
          )}

          {editMode || (generalNotes && generalNotes.trim() !== '...') ? (
            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <button className="w-full justify-between h-10 text-[11px] font-black uppercase tracking-widest bg-secondary/30 rounded-xl px-4 border border-border/30 flex items-center">
                  <span>Note Generali</span>
                  {isNotesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
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
          ) : null}

          <Card className="border-border shadow-xl bg-card/40 rounded-2xl overflow-hidden">
            {editMode && (
              <CardHeader className="py-3 bg-secondary/40 flex flex-row items-center justify-between px-5 border-b border-border/40">
                <CardTitle className="text-[12px] uppercase tracking-widest font-black text-primary flex items-center gap-2"><Layers className="w-5 h-5" /> Struttura Brano</CardTitle>
                <button onClick={() => handleAddSection(sections.length)} className="h-9 text-[11px] font-bold bg-background/50 border px-3 rounded flex items-center gap-2"><Plus className="w-4 h-4 mr-1" /> Sezione</button>
              </CardHeader>
            )}
            <CardContent className="p-0">
              <div className="flex flex-col">
                {sections.map((section, sIdx) => (
                  <React.Fragment key={section.id}>
                    {editMode && sIdx === 0 && (
                      <div className="flex items-center justify-center h-8 group/insert">
                        <button onClick={() => handleAddSection(0)} className="opacity-0 group-hover/insert:opacity-100 flex items-center gap-2 text-[10px] font-bold uppercase text-primary transition-opacity">
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
                            <SelectTrigger className={cn(
                              "w-full h-9 text-[12px] font-black uppercase border p-1",
                              SECTION_COLORS[section.type as SectionType]?.bg,
                              SECTION_COLORS[section.type as SectionType]?.text,
                              SECTION_COLORS[section.type as SectionType]?.border
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"].map(t => (
                                <SelectItem key={t} value={t} className="text-[11px] font-bold uppercase">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "w-full justify-center h-9 text-[13px] font-black uppercase tracking-tighter border",
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
                            <Popover onOpenChange={() => { setChordPickerStep('letter'); setSelectedLetter(null); setSelectedRoot(null); }}>
                              <PopoverTrigger asChild>
                                <button className="h-8 w-8 rounded-full border border-dashed border-primary/20 text-primary/40 hover:text-primary hover:border-primary/50 flex items-center justify-center" title="Inserisci accordo all'inizio">
                                  <Plus className="w-4 h-4" />
                                </button>
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
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : SECTION_COLORS[section.type as SectionType]?.bg,
                                      chord.startsWith('x') && chord.length <= 3
                                        ? ""
                                        : SECTION_COLORS[section.type as SectionType]?.border,
                                      chord.startsWith('x') && chord.length <= 3
                                        ? ""
                                        : SECTION_COLORS[section.type as SectionType]?.text
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
                                    <button className="h-8 w-8 rounded-full border border-dashed border-primary/10 text-primary/20 hover:text-primary hover:border-primary/50 transition-all opacity-0 hover:opacity-100 flex items-center justify-center">
                                      <Plus className="w-3 h-3" />
                                    </button>
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
                          <button className="h-10 w-10 text-muted-foreground/30 hover:text-destructive transition-colors flex items-center justify-center" onClick={() => { setSectionToDelete(section.id); setIsDeleteSectionDialogOpen(true); }} title="Elimina sezione">
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <div className="flex items-center justify-center h-8 group/insert relative">
                        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-primary/5 -translate-y-1/2" />
                        <button onClick={() => handleAddSection(sIdx + 1)} className="relative z-10 opacity-0 group-hover/insert:opacity-100 bg-background px-3 flex items-center gap-2 text-[10px] font-bold uppercase text-primary transition-opacity border border-primary/20 rounded-full py-1">
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
      </div>
    </TooltipProvider>
  );
}
