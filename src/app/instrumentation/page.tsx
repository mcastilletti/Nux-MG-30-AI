"use client";

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Speaker, Star } from 'lucide-react';
import { ElectricGuitarIcon } from '@/components/icons/electric-guitar-icon';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useInstrumentationStore } from '@/stores/use-instrumentation-store';
import { Amplifier, Guitar, GuitarPickup, PickupType, PickupPosition, AmpInputPosition } from '@/types/instrumentation';

const newPickup = (): GuitarPickup => ({ id: crypto.randomUUID(), position: 'bridge', type: 'humbucker', model: '' });

const ampInputLabels: Record<AmpInputPosition, string> = {
  'before-preamp': 'Prima del preamplificatore',
  'after-preamp': 'Dopo il preamplificatore',
  'active-cab': 'Cassa attiva',
  'passive-cab': 'Cassa passiva',
  'frfr-cab': 'Cassa FRFR',
};

export default function InstrumentationPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { guitars, amplifiers, selectedGuitarId, selectedAmplifierId, setGuitars, setAmplifiers, selectGuitar, selectAmplifier } = useInstrumentationStore();
  const [loading, setLoading] = useState(false);
  const [guitarDialog, setGuitarDialog] = useState(false);
  const [ampDialog, setAmpDialog] = useState(false);
  const [editingGuitar, setEditingGuitar] = useState<Guitar | null>(null);
  const [editingAmp, setEditingAmp] = useState<Amplifier | null>(null);
  const [guitarModel, setGuitarModel] = useState('');
  const [pickups, setPickups] = useState<GuitarPickup[]>([newPickup()]);
  const [ampModel, setAmpModel] = useState('');
  const [inputPosition, setInputPosition] = useState<AmpInputPosition>('before-preamp');

  useEffect(() => {
    if (isUserLoading || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [guitarSnapshot, ampSnapshot] = await Promise.all([
          getDocs(query(collection(firestore, 'guitars'), where('userId', '==', user.uid))),
          getDocs(query(collection(firestore, 'amplifiers'), where('userId', '==', user.uid))),
        ]);
        setGuitars(guitarSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as Guitar)));
        setAmplifiers(ampSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as Amplifier)));
      } catch (error) {
        console.error('Error loading instrumentation', error);
        toast({ title: 'Errore caricamento strumentazione', variant: 'destructive' });
      } finally { setLoading(false); }
    };
    load();
  }, [firestore, isUserLoading, setAmplifiers, setGuitars, toast, user]);

  const resetGuitarForm = () => { setEditingGuitar(null); setGuitarModel(''); setPickups([newPickup()]); };
  const resetAmpForm = () => { setEditingAmp(null); setAmpModel(''); setInputPosition('before-preamp'); };
  const openGuitar = (guitar?: Guitar) => {
    if (guitar) { setEditingGuitar(guitar); setGuitarModel(guitar.model); setPickups(guitar.pickups.map(pickup => ({ ...pickup, position: pickup.position || 'bridge' }))); }
    else resetGuitarForm();
    setGuitarDialog(true);
  };
  const openAmp = (amp?: Amplifier) => {
    if (amp) { setEditingAmp(amp); setAmpModel(amp.model); setInputPosition(amp.inputPosition); }
    else resetAmpForm();
    setAmpDialog(true);
  };

  const saveGuitar = async () => {
    if (!guitarModel.trim() || pickups.length === 0) return;
    const clean = pickups.map(p => {
      const model = p.model?.trim();
      const position = p.position || 'bridge';
      return model ? { ...p, position, model } : { id: p.id, position, type: p.type };
    });
    try {
      if (user) {
        const data = { model: guitarModel.trim(), pickups: clean, userId: user.uid, updatedAt: serverTimestamp() };
        if (editingGuitar) { await updateDoc(doc(firestore, 'guitars', editingGuitar.id), data); setGuitars(guitars.map(g => g.id === editingGuitar.id ? { ...g, ...data } : g)); }
        else { const ref = await addDoc(collection(firestore, 'guitars'), { ...data, createdAt: serverTimestamp() }); setGuitars([...guitars, { ...data, id: ref.id }]); }
      } else {
        const saved = { id: editingGuitar?.id || crypto.randomUUID(), model: guitarModel.trim(), pickups: clean };
        setGuitars(editingGuitar ? guitars.map(g => g.id === saved.id ? saved : g) : [...guitars, saved]);
      }
      setGuitarDialog(false); toast({ title: editingGuitar ? 'Chitarra aggiornata' : 'Chitarra aggiunta' });
    } catch (error) { console.error(error); toast({ title: 'Errore salvataggio chitarra', variant: 'destructive' }); }
  };

  const saveAmp = async () => {
    if (!ampModel.trim()) return;
    try {
      if (user) {
        const data = { model: ampModel.trim(), inputPosition, userId: user.uid, updatedAt: serverTimestamp() };
        if (editingAmp) { await updateDoc(doc(firestore, 'amplifiers', editingAmp.id), data); setAmplifiers(amplifiers.map(a => a.id === editingAmp.id ? { ...a, ...data } : a)); }
        else { const ref = await addDoc(collection(firestore, 'amplifiers'), { ...data, createdAt: serverTimestamp() }); setAmplifiers([...amplifiers, { ...data, id: ref.id }]); }
      } else {
        const saved = { id: editingAmp?.id || crypto.randomUUID(), model: ampModel.trim(), inputPosition };
        setAmplifiers(editingAmp ? amplifiers.map(a => a.id === saved.id ? saved : a) : [...amplifiers, saved]);
      }
      setAmpDialog(false); toast({ title: editingAmp ? 'Amplificatore aggiornato' : 'Amplificatore aggiunto' });
    } catch (error) { console.error(error); toast({ title: 'Errore salvataggio amplificatore', variant: 'destructive' }); }
  };

  const remove = async (kind: 'guitar' | 'amp', id: string) => {
    try {
      if (user) await deleteDoc(doc(firestore, kind === 'guitar' ? 'guitars' : 'amplifiers', id));
      if (kind === 'guitar') { setGuitars(guitars.filter(item => item.id !== id)); if (selectedGuitarId === id) selectGuitar(undefined); }
      else { setAmplifiers(amplifiers.filter(item => item.id !== id)); if (selectedAmplifierId === id) selectAmplifier(undefined); }
      toast({ title: 'Elemento eliminato' });
    } catch (error) { console.error(error); toast({ title: 'Errore eliminazione', variant: 'destructive' }); }
  };

  return <AppShell><main className="mx-auto max-w-[1200px] space-y-6 py-2">
    <div><p className="section-kicker">Setup personale</p><h1 className="mt-2 text-3xl font-black tracking-tight">Strumentazione</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Configura chitarre e amplificatori. La strumentazione selezionata verrà usata automaticamente dall’AI Mode.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><ElectricGuitarIcon className="h-5 w-5 text-primary" /> Chitarre</CardTitle><Button onClick={() => openGuitar()} size="sm"><Plus className="mr-2 h-4 w-4" /> Aggiungi</Button></CardHeader><CardContent className="space-y-3">
        {guitars.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nessuna chitarra inserita.</p>}
        {guitars.map(g => <div key={g.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/10 p-3"><button onClick={() => selectGuitar(selectedGuitarId === g.id ? undefined : g.id)} className="text-primary" aria-label="Seleziona chitarra">{selectedGuitarId === g.id ? <Star className="h-5 w-5 fill-current" /> : <Star className="h-5 w-5" />}</button><div className="min-w-0 flex-1"><p className="font-semibold">{g.model}</p><p className="text-xs text-muted-foreground">{g.pickups.length} pickup · {g.pickups.map(p => `${p.position === 'neck' ? 'Manico' : p.position === 'middle' ? 'Centrale' : 'Ponte'} ${p.type === 'single-coil' ? 'Single' : 'Humbucker'}`).join(' / ')}</p></div><Button variant="ghost" size="icon" onClick={() => openGuitar(g)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove('guitar', g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
      </CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Speaker className="h-5 w-5 text-primary" /> Amplificatori</CardTitle><Button onClick={() => openAmp()} size="sm"><Plus className="mr-2 h-4 w-4" /> Aggiungi</Button></CardHeader><CardContent className="space-y-3">
        {amplifiers.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nessun amplificatore inserito.</p>}
        {amplifiers.map(a => <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/10 p-3"><button onClick={() => selectAmplifier(selectedAmplifierId === a.id ? undefined : a.id)} className="text-primary" aria-label="Seleziona amplificatore">{selectedAmplifierId === a.id ? <Star className="h-5 w-5 fill-current" /> : <Star className="h-5 w-5" />}</button><div className="min-w-0 flex-1"><p className="font-semibold">{a.model}</p><p className="text-xs text-muted-foreground">{ampInputLabels[a.inputPosition] || 'Ingresso non specificato'}</p></div><Button variant="ghost" size="icon" onClick={() => openAmp(a)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove('amp', a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
      </CardContent></Card>
    </div>
    {!user && <p className="text-xs text-muted-foreground">Accesso locale attivo: accedi con Google per sincronizzare la strumentazione nel cloud.</p>}

    <Dialog open={guitarDialog} onOpenChange={setGuitarDialog}><DialogContent><DialogHeader><DialogTitle>{editingGuitar ? 'Modifica chitarra' : 'Nuova chitarra'}</DialogTitle><DialogDescription>Inserisci modello e configurazione dei pickup.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Modello</Label><Input value={guitarModel} onChange={e => setGuitarModel(e.target.value)} placeholder="Es. Gibson Les Paul Standard" /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Pickup ({pickups.length})</Label><Button variant="outline" size="sm" onClick={() => setPickups([...pickups, newPickup()])}><Plus className="mr-1 h-3 w-3" /> Pickup</Button></div>{pickups.map((pickup, index) => <div key={pickup.id} className="grid grid-cols-[auto_1fr_auto] items-end gap-2 rounded-lg border p-3"><span className="pb-2 text-xs font-bold text-muted-foreground">#{index + 1}</span><div className="grid gap-2 sm:grid-cols-3"><Select value={pickup.position} onValueChange={(value: PickupPosition) => setPickups(pickups.map(p => p.id === pickup.id ? { ...p, position: value } : p))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="neck">Manico</SelectItem><SelectItem value="middle">Centrale</SelectItem><SelectItem value="bridge">Ponte</SelectItem></SelectContent></Select><Select value={pickup.type} onValueChange={(value: PickupType) => setPickups(pickups.map(p => p.id === pickup.id ? { ...p, type: value } : p))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single-coil">Single coil</SelectItem><SelectItem value="humbucker">Humbucker</SelectItem></SelectContent></Select><Input value={pickup.model || ''} onChange={e => setPickups(pickups.map(p => p.id === pickup.id ? { ...p, model: e.target.value } : p))} placeholder="Modello (facoltativo)" /></div><Button variant="ghost" size="icon" disabled={pickups.length === 1} onClick={() => setPickups(pickups.filter(p => p.id !== pickup.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div></div><DialogFooter><Button variant="outline" onClick={() => setGuitarDialog(false)}>Annulla</Button><Button onClick={saveGuitar} disabled={!guitarModel.trim()}>Salva chitarra</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={ampDialog} onOpenChange={setAmpDialog}><DialogContent><DialogHeader><DialogTitle>{editingAmp ? 'Modifica amplificatore' : 'Nuovo amplificatore'}</DialogTitle><DialogDescription>Indica il tipo di collegamento del tuo amplificatore o della cassa.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Modello</Label><Input value={ampModel} onChange={e => setAmpModel(e.target.value)} placeholder="Es. Fender Deluxe Reverb" /></div><div className="space-y-2"><Label>Ingresso / collegamento</Label><Select value={inputPosition} onValueChange={(value: AmpInputPosition) => setInputPosition(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ampInputLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setAmpDialog(false)}>Annulla</Button><Button onClick={saveAmp} disabled={!ampModel.trim()}>Salva amplificatore</Button></DialogFooter></DialogContent></Dialog>
  </main></AppShell>;
}
