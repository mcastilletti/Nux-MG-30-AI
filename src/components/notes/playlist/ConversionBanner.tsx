'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Download, ListMusic, Loader2 } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { firestoreMigrationWriter, loadAllNotes, loadPlaylistData } from '@/lib/firestore-playlists';
import { planPlaylistMigration, type MigrationPlan } from '@/lib/playlist-migration';
import { runPlaylistMigration } from '@/lib/playlist-migration-run';
import { isOnline } from '@/lib/firestore-write';
import { useNotesCache } from '@/stores/use-notes-cache';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';

/**
 * Avviso "Nuova organizzazione a playlist" (spec §3, avvio manuale):
 * backup e conversione decisi dall'utente, con riepilogo prima di scrivere.
 */
export function ConversionBanner({ onBackup, backupDownloaded }: { onBackup: () => void; backupDownloaded: boolean }) {
  const { firestore } = useFirebase() as { firestore: Firestore };
  const { user } = useUser();
  const { toast } = useToast();
  const [online, setOnline] = useState(true);
  const [stage, setStage] = useState<'idle' | 'planning' | 'confirm' | 'running'>('idle');
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => setOnline(isOnline());
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (!user) return null;

  const prepare = async () => {
    setStage('planning');
    try {
      const [notes, data] = await Promise.all([loadAllNotes(firestore, user.uid), loadPlaylistData(firestore, user.uid)]);
      if (data.marker && data.marker.version >= 2) {
        // Già convertito da un altro dispositivo.
        usePlaylistsCache.getState().setData(data);
        useNotesCache.getState().setNotes(notes);
        setStage('idle');
        return;
      }
      setPlan(planPlaylistMigration({ notes, bands: data.bands, setlists: data.playlists }));
      setStage('confirm');
    } catch (error) {
      console.error('[playlist] preparazione della conversione non riuscita', error);
      toast({ title: 'Impossibile leggere i dati dell\'account', description: 'Controlla la connessione e riprova.', variant: 'destructive' });
      setStage('idle');
    }
  };

  const convert = async () => {
    if (!plan) return;
    setStage('running');
    setProgress(0);
    try {
      await runPlaylistMigration(plan, { uid: user.uid, writer: firestoreMigrationWriter(firestore), onProgress: (done, total) => setProgress(Math.round((done / total) * 100)) });
      const [notes, data] = await Promise.all([loadAllNotes(firestore, user.uid), loadPlaylistData(firestore, user.uid)]);
      useNotesCache.getState().setNotes(notes);
      usePlaylistsCache.getState().setData(data);
      toast({
        title: 'Conversione completata',
        description: `${plan.summary.playlists} playlist, ${plan.summary.merged} doppioni uniti, ${plan.summary.pool} brani e blocchi nel serbatoio.`,
      });
      setStage('idle');
    } catch (error) {
      console.error('[playlist] conversione interrotta', error);
      toast({
        title: 'Conversione interrotta',
        description: 'Nessun dato è stato perso. Riprova: la conversione riparte da dove si era fermata.',
        variant: 'destructive',
      });
      setStage('idle');
    }
  };

  const s = plan?.summary;
  return (
    <section aria-labelledby="conversion-title" className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
      <h3 id="conversion-title" className="flex items-center gap-2 text-base font-black"><ListMusic className="h-5 w-5 text-primary" aria-hidden="true" /> Nuova organizzazione a playlist</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        I brani finiscono in un unico serbatoio e le scalette diventano playlist: lo stesso brano può stare in più playlist senza duplicarlo.
        Prima di convertire, scarica un backup.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11 gap-2" onClick={onBackup}>
          <Download className="h-4 w-4" aria-hidden="true" /> {backupDownloaded ? 'Backup scaricato' : 'Scarica backup'}
        </Button>
        <Button className="min-h-11 gap-2" onClick={prepare} disabled={!online || stage !== 'idle'}>
          {stage === 'planning' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Converti
        </Button>
      </div>
      {!online && <p className="mt-2 text-caption text-warning">Serve la connessione per convertire.</p>}

      <AlertDialog open={stage === 'confirm' || stage === 'running'} onOpenChange={(open) => { if (!open && stage === 'confirm') setStage('idle'); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertire le scalette in playlist?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {s && (
                  <ul className="list-disc space-y-1 pl-5">
                    <li><strong className="text-foreground">{s.playlists} playlist</strong>, con lo stesso ordine e lo stesso preset di oggi</li>
                    <li><strong className="text-foreground">{s.merged} doppioni uniti</strong> (stesso contenuto): {s.notes} note diventano {s.pool} brani e blocchi</li>
                    {s.unassigned > 0 && <li>{s.unassigned} note senza scaletta restano solo nel serbatoio</li>}
                    {s.bandsCreated > 0 && <li>{s.bandsCreated} band aggiunte alla pagina Band</li>}
                  </ul>
                )}
                <p>Nessun brano viene cancellato o modificato nel contenuto.</p>
                {!backupDownloaded && <p className="font-semibold text-warning">Non hai ancora scaricato il backup in questa sessione.</p>}
                {stage === 'running' && <p role="status" className="font-semibold text-foreground">Conversione in corso… {progress}%</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={stage === 'running'}>Annulla</AlertDialogCancel>
            <Button className="min-h-11 gap-2" onClick={convert} disabled={stage === 'running'}>
              {stage === 'running' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Converti
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
