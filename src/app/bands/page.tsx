"use client"

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Music2, Plus, Trash2, Edit, Layers, ChevronRight, Users } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface Band {
  id: string;
  name: string;
  logoUrl?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Setlist {
  id: string;
  name: string;
  bandId: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

function BandsContent() {
  const { toast } = useToast();
  const { firestore, storage } = useFirebase();
  const { user, isUserLoading: userLoading } = useUser();
  
  const [bands, setBands] = useState<Band[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [notesBands, setNotesBands] = useState<Set<string>>(new Set());
  const [notesSetlists, setNotesSetlists] = useState<Map<string, Set<string>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isBandDialogOpen, setIsBandDialogOpen] = useState(false);
  const [isSetlistDialogOpen, setIsSetlistDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [selectedBandForSetlist, setSelectedBandForSetlist] = useState<Band | null>(null);
  
  const [bandName, setBandName] = useState('');
  const [bandLogo, setBandLogo] = useState<File | null>(null);
  const [bandLogoPreview, setBandLogoPreview] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [setlistName, setSetlistName] = useState('');
  
  const [isDeleteBandDialogOpen, setIsDeleteBandDialogOpen] = useState(false);
  const [isDeleteSetlistDialogOpen, setIsDeleteSetlistDialogOpen] = useState(false);
  const [bandToDelete, setBandToDelete] = useState<Band | null>(null);
  const [setlistToDelete, setSetlistToDelete] = useState<Setlist | null>(null);

  useEffect(() => {
    if (userLoading || !user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [bandsSnapshot, setlistsSnapshot, notesSnapshot] = await Promise.all([
          getDocs(query(collection(firestore, "bands"), where("userId", "==", user.uid))),
          getDocs(query(collection(firestore, "setlists"), where("userId", "==", user.uid))),
          getDocs(query(collection(firestore, "notes"), where("userId", "==", user.uid)))
        ]);
        
        const loadedBands = bandsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Band));
        const loadedSetlists = setlistsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Setlist));
        
        // Extract bands and setlists from existing notes
        const notesBandsSet = new Set<string>();
        const notesSetlistsMap = new Map<string, Set<string>>();
        
        notesSnapshot.docs.forEach((doc) => {
          const note = doc.data();
          if (note.band) {
            notesBandsSet.add(note.band);
            if (note.setlist) {
              if (!notesSetlistsMap.has(note.band)) {
                notesSetlistsMap.set(note.band, new Set());
              }
              notesSetlistsMap.get(note.band)!.add(note.setlist);
            }
          }
        });
        
        setBands(loadedBands);
        setSetlists(loadedSetlists);
        setNotesBands(notesBandsSet);
        setNotesSetlists(notesSetlistsMap);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: "Errore caricamento dati", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, userLoading, firestore, toast]);

  const getSetlistsForBand = (bandId: string, bandName: string) => {
    const formalSetlists = setlists.filter(s => s.bandId === bandId);
    const notesSetlistsForBand = notesSetlists.get(bandName) || new Set();
    
    // Combine formal setlists with notes setlists, avoiding duplicates
    const allSetlists = [...formalSetlists];
    notesSetlistsForBand.forEach(notesSetlistName => {
      if (!formalSetlists.some(fs => fs.name === notesSetlistName)) {
        allSetlists.push({
          id: `notes-${notesSetlistName}`,
          name: notesSetlistName,
          bandId: bandId,
          userId: user?.uid || '',
          isFromNotes: true
        } as Setlist & { isFromNotes?: boolean });
      }
    });
    
    return allSetlists.sort((a, b) => a.name.localeCompare(b.name));
  };

  const getAllBands = () => {
    const formalBandNames = new Set(bands.map(b => b.name));
    const allBandNames = [...notesBands].filter(bandName => !formalBandNames.has(bandName));
    
    const allBands = [...bands];
    allBandNames.forEach(bandName => {
      allBands.push({
        id: `notes-${bandName}`,
        name: bandName,
        userId: user?.uid || '',
        isFromNotes: true
      } as Band & { isFromNotes?: boolean });
    });
    
    return allBands.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    if (!storage || !user) {
      toast({ title: "Storage non disponibile", variant: "destructive" });
      throw new Error('Storage not available');
    }
    
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `band-logos/${user.uid}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  };

  const handleCreateBand = async () => {
    if (!bandName.trim() || !user) return;
    
    try {
      setIsUploadingLogo(true);
      
      let logoUrl = '';
      if (bandLogo) {
        logoUrl = await handleLogoUpload(bandLogo);
      }
      
      const newBand = {
        name: bandName.trim(),
        logoUrl,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "bands"), newBand);
      setBands([...bands, { ...newBand, id: docRef.id }]);
      setBandName('');
      setBandLogo(null);
      setBandLogoPreview('');
      setIsBandDialogOpen(false);
      toast({ title: "Band creata con successo" });
    } catch (error) {
      console.error('Error creating band:', error);
      toast({ title: "Errore creazione band", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateBand = async () => {
    if (!editingBand || !bandName.trim()) return;
    
    try {
      setIsUploadingLogo(true);
      
      let logoUrl = editingBand.logoUrl;
      if (bandLogo) {
        logoUrl = await handleLogoUpload(bandLogo);
      }
      
      const isFromNotes = (editingBand as Band & { isFromNotes?: boolean }).isFromNotes;
      
      if (isFromNotes) {
        // Se è una band dalle note, la creiamo formalmente
        const newBand = {
          name: bandName.trim(),
          logoUrl,
          userId: user?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(firestore, "bands"), newBand);
        const createdBand = { ...newBand, id: docRef.id };
        
        // Rimuovi dalle note bands e aggiungi alle bands formali
        setNotesBands(prev => {
          const newSet = new Set(prev);
          newSet.delete(editingBand.name);
          return newSet;
        });
        setBands([...bands, createdBand]);
      } else {
        // Se è una band formale, la aggiorniamo normalmente
        await updateDoc(doc(firestore, "bands", editingBand.id), {
          name: bandName.trim(),
          logoUrl,
          updatedAt: serverTimestamp()
        });
        
        setBands(bands.map(b => b.id === editingBand.id ? { ...b, name: bandName.trim(), logoUrl } : b));
      }
      
      setBandName('');
      setBandLogo(null);
      setBandLogoPreview('');
      setEditingBand(null);
      setIsBandDialogOpen(false);
      toast({ title: isFromNotes ? "Band formalizzata con successo" : "Band aggiornata con successo" });
    } catch (error) {
      console.error('Error updating band:', error);
      toast({ title: "Errore aggiornamento band", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteBand = async () => {
    if (!bandToDelete) return;
    
    try {
      const bandSetlists = getSetlistsForBand(bandToDelete.id);
      
      const batch = firestore.batch();
      batch.delete(doc(firestore, "bands", bandToDelete.id));
      
      bandSetlists.forEach(setlist => {
        batch.delete(doc(firestore, "setlists", setlist.id));
      });
      
      await batch.commit();
      
      setBands(bands.filter(b => b.id !== bandToDelete.id));
      setSetlists(setlists.filter(s => s.bandId !== bandToDelete.id));
      setIsDeleteBandDialogOpen(false);
      setBandToDelete(null);
      toast({ title: "Band e scalette eliminate con successo" });
    } catch (error) {
      console.error('Error deleting band:', error);
      toast({ title: "Errore eliminazione band", variant: "destructive" });
    }
  };

  const handleCreateSetlist = async () => {
    if (!setlistName.trim() || !selectedBandForSetlist || !user) return;
    
    try {
      const newSetlist = {
        name: setlistName.trim(),
        bandId: selectedBandForSetlist.id,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "setlists"), newSetlist);
      setSetlists([...setlists, { ...newSetlist, id: docRef.id }]);
      setSetlistName('');
      setSelectedBandForSetlist(null);
      setIsSetlistDialogOpen(false);
      toast({ title: "Scaletta creata con successo" });
    } catch (error) {
      console.error('Error creating setlist:', error);
      toast({ title: "Errore creazione scaletta", variant: "destructive" });
    }
  };

  const handleUpdateSetlist = async () => {
    if (!editingSetlist || !setlistName.trim()) return;
    
    try {
      await updateDoc(doc(firestore, "setlists", editingSetlist.id), {
        name: setlistName.trim(),
        updatedAt: serverTimestamp()
      });
      
      setSetlists(setlists.map(s => s.id === editingSetlist.id ? { ...s, name: setlistName.trim() } : s));
      setSetlistName('');
      setEditingSetlist(null);
      setIsSetlistDialogOpen(false);
      toast({ title: "Scaletta aggiornata con successo" });
    } catch (error) {
      console.error('Error updating setlist:', error);
      toast({ title: "Errore aggiornamento scaletta", variant: "destructive" });
    }
  };

  const handleDeleteSetlist = async () => {
    if (!setlistToDelete) return;
    
    try {
      await deleteDoc(doc(firestore, "setlists", setlistToDelete.id));
      setSetlists(setlists.filter(s => s.id !== setlistToDelete.id));
      setIsDeleteSetlistDialogOpen(false);
      setSetlistToDelete(null);
      toast({ title: "Scaletta eliminata con successo" });
    } catch (error) {
      console.error('Error deleting setlist:', error);
      toast({ title: "Errore eliminazione scaletta", variant: "destructive" });
    }
  };

  const openBandDialog = (band?: Band) => {
    if (band) {
      setEditingBand(band);
      setBandName(band.name);
      setBandLogoPreview(band.logoUrl || '');
    } else {
      setEditingBand(null);
      setBandName('');
      setBandLogoPreview('');
    }
    setBandLogo(null);
    setIsBandDialogOpen(true);
  };

  const openSetlistDialog = (band: Band, setlist?: Setlist) => {
    setSelectedBandForSetlist(band);
    if (setlist) {
      setEditingSetlist(setlist);
      setSetlistName(setlist.name);
    } else {
      setEditingSetlist(null);
      setSetlistName('');
    }
    setIsSetlistDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Caricamento band e scalette...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 pb-20 px-2 md:px-0">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestione band</h2>
              <p className="text-sm text-muted-foreground">Organizza le tue scalette musicali</p>
            </div>
          </div>
          <Button 
            onClick={() => openBandDialog()} 
            className="gap-2 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Nuova Band
          </Button>
        </header>

        {getAllBands().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="relative">
              <div className="relative rounded-2xl border border-primary/20 bg-primary/10 p-6">
                <Users className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Nessuna band</h3>
              <p className="text-sm text-muted-foreground max-w-md">Crea la tua prima band per iniziare a organizzare le tue scalette musicali in modo professionale</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {getAllBands().map((band) => {
              const bandSetlists = getSetlistsForBand(band.id, band.name);
              const isFromNotes = (band as Band & { isFromNotes?: boolean }).isFromNotes;
              return (
                <Card key={band.id} className={cn(
                  "overflow-hidden transition-all duration-300 hover:shadow-xl",
                  isFromNotes 
                    ? "border-muted-foreground/20 bg-muted/30" 
                    : "border-primary/20 bg-primary/[0.03]"
                )}>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-16 h-16 rounded-xl border transition-all duration-300 flex items-center justify-center overflow-hidden",
                            isFromNotes 
                              ? "bg-muted/50 border-muted-foreground/30" 
                              : "bg-primary/10 border-primary/30"
                          )}>
                            {band.logoUrl ? (
                              <img src={band.logoUrl} alt={band.name} className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className={cn("w-6 h-6", isFromNotes ? "text-muted-foreground" : "text-primary")} />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold">{band.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn(
                                "text-xs font-semibold px-2.5 py-0.5",
                                isFromNotes 
                                  ? "bg-muted/50 border-muted-foreground/30 text-muted-foreground" 
                                    : "bg-primary/10 border-primary/30 text-primary"
                              )}>
                                {bandSetlists.length} {bandSetlists.length === 1 ? 'scaletta' : 'scalette'}
                              </Badge>
                              {isFromNotes && (
                                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-muted/50 border-muted-foreground/30 text-muted-foreground">
                                  Dalle note
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => openBandDialog(band)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!isFromNotes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              onClick={() => {
                                setBandToDelete(band);
                                setIsDeleteBandDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {bandSetlists.length > 0 ? (
                        <div className="space-y-2 pl-16">
                          {bandSetlists.map((setlist) => {
                            const isSetlistFromNotes = (setlist as Setlist & { isFromNotes?: boolean }).isFromNotes;
                            return (
                              <div
                                key={setlist.id}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02]",
                                  isSetlistFromNotes 
                                    ? "bg-muted/30 border-muted-foreground/20 hover:bg-muted/50" 
                                    : "bg-primary/[0.03] border-primary/20 hover:bg-primary/10 hover:border-primary/30"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg border transition-colors",
                                    isSetlistFromNotes 
                                      ? "bg-muted/50 border-muted-foreground/30" 
                                      : "bg-primary/10 border-primary/30"
                                  )}>
                                    <Layers className={cn("w-4 h-4", isSetlistFromNotes ? "text-muted-foreground" : "text-primary")} />
                                  </div>
                                  <span className="font-medium text-sm">{setlist.name}</span>
                                  {isSetlistFromNotes && (
                                    <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-muted/50 border-muted-foreground/30 text-muted-foreground">
                                      Dalle note
                                    </Badge>
                                  )}
                                </div>
                                {!isSetlistFromNotes && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                      onClick={() => openSetlistDialog(band, setlist)}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                      onClick={() => {
                                        setSetlistToDelete(setlist);
                                        setIsDeleteSetlistDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pl-16 py-4 text-sm text-muted-foreground italic">
                          Nessuna scaletta creata per questa band
                        </div>
                      )}

                      {!isFromNotes && (
                        <div className="pl-16 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
                            onClick={() => openSetlistDialog(band)}
                          >
                            <Plus className="w-4 h-4" />
                            Aggiungi Scaletta
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Band Dialog */}
        <Dialog open={isBandDialogOpen} onOpenChange={setIsBandDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingBand ? 'Modifica Band' : 'Nuova Band'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editingBand ? 'Modifica il nome della band esistente.' : 'Crea una nuova band per organizzare le tue scalette.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nome Band</label>
                <Input
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  placeholder="Es. The Beatles, Queen, Metallica..."
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Logo Band (opzionale)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden bg-muted/30">
                    {bandLogoPreview ? (
                      <img src={bandLogoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBandLogo(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBandLogoPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsBandDialogOpen(false)} className="font-semibold">
                Annulla
              </Button>
              <Button 
                onClick={editingBand ? handleUpdateBand : handleCreateBand}
                disabled={!bandName.trim() || isUploadingLogo}
                className="font-semibold"
              >
                {isUploadingLogo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Caricamento...
                  </>
                ) : (
                  editingBand ? 'Aggiorna' : 'Crea'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Setlist Dialog */}
        <Dialog open={isSetlistDialogOpen} onOpenChange={setIsSetlistDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingSetlist ? 'Modifica Scaletta' : 'Nuova Scaletta'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editingSetlist 
                  ? `Modifica la scaletta per ${selectedBandForSetlist?.name}.` 
                  : `Crea una nuova scaletta per ${selectedBandForSetlist?.name}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nome Scaletta</label>
                <Input
                  value={setlistName}
                  onChange={(e) => setSetlistName(e.target.value)}
                  placeholder="Es. Tour 2024, Festival, Radio Show..."
                  className="h-11"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsSetlistDialogOpen(false)} className="font-semibold">
                Annulla
              </Button>
              <Button 
                onClick={editingSetlist ? handleUpdateSetlist : handleCreateSetlist}
                disabled={!setlistName.trim()}
                className="font-semibold"
              >
                {editingSetlist ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Band Dialog */}
        <Dialog open={isDeleteBandDialogOpen} onOpenChange={setIsDeleteBandDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-400">Elimina Band</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Sei sicuro di voler eliminare <span className="font-semibold text-foreground">"{bandToDelete?.name}"</span>? Questa azione eliminerà anche tutte le scalette associate. Questa azione è irreversibile.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteBandDialogOpen(false)} className="font-semibold">
                Annulla
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteBand}
                className="font-semibold"
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Setlist Dialog */}
        <Dialog open={isDeleteSetlistDialogOpen} onOpenChange={setIsDeleteSetlistDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-400">Elimina Scaletta</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Sei sicuro di voler eliminare <span className="font-semibold text-foreground">"{setlistToDelete?.name}"</span>? Questa azione è irreversibile.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteSetlistDialogOpen(false)} className="font-semibold">
                Annulla
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteSetlist}
                className="font-semibold"
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function BandsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <BandsContent />
    </Suspense>
  );
}
