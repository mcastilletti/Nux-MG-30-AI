"use client"

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ListMusic, Loader2, Music2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconButton } from '@/components/common/icon-button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { usePlaylistActions } from '@/hooks/use-playlist-actions';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';
import { useNotesCache } from '@/stores/use-notes-cache';
import { indexNotes, playlistEntries } from '@/lib/playlist-ops';
import { nameKey } from '@/lib/playlist-migration';
import { cn } from '@/lib/utils';
import type { Band, Playlist } from '@/types/playlist';

/**
 * Pagina Band (spec playlist §5): band e playlist reali, create, rinominate ed
 * eliminate qui; i brani stanno nel serbatoio e si gestiscono dalla pagina Note.
 */
export default function BandsPage() {
  const { toast } = useToast();
  const { storage } = useFirebase();
  const { user, isUserLoading } = useUser();
  const actions = usePlaylistActions();
  const bands = usePlaylistsCache((s) => s.bands);
  const playlists = usePlaylistsCache((s) => s.playlists);
  const marker = usePlaylistsCache((s) => s.marker);
  const notes = useNotesCache((s) => s.notes);
  const [loading, setLoading] = useState(true);
  const converted = !!marker && marker.version >= 2;

  // Dialoghi
  const [bandDialog, setBandDialog] = useState<{ band: Band | null } | null>(null);
  const [playlistDialog, setPlaylistDialog] = useState<{ band: Band; playlist: Playlist | null } | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [bandToDelete, setBandToDelete] = useState<Band | null>(null);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { setLoading(false); return; }
    actions.refresh()
      .catch((error) => {
        console.warn('[band] caricamento non riuscito', error);
        toast({ title: 'Band non aggiornate', description: 'Mostro la copia sul dispositivo.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading]);

  const notesById = useMemo(() => indexNotes(notes), [notes]);
  const sortedBands = useMemo(() => [...bands].sort((a, b) => a.name.localeCompare(b.name, 'it')), [bands]);
  const playlistsOf = (bandId: string) => playlists.filter((p) => p.bandId === bandId).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const songCount = (playlist: Playlist) => playlistEntries(playlist, notesById).length;

  // Senza account si mostra solo una copia locale già convertita (al logout la cache viene svuotata).
  if (!isUserLoading && !user && !converted) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Accedi per gestire band e playlist"
        description="Band e playlist sono salvate nel tuo account. Accedi con Google dal menu laterale."
      />
    );
  }

  if (loading && bands.length === 0) {
    return <EmptyState icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Caricamento band e playlist…" />;
  }

  if (!converted) {
    return (
      <EmptyState
        icon={<ListMusic className="h-10 w-10" />}
        title="Prima converti le scalette in playlist"
        description="Band e playlist si gestiscono qui dopo la conversione. Apri la pagina Note e usa l'avviso «Nuova organizzazione a playlist»."
        action={<Button asChild className="min-h-11"><Link href="/notes">Vai alle Note</Link></Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-2 pb-20 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Band e playlist</h2>
            <p className="text-sm text-muted-foreground">I brani si aggiungono alle playlist dalla pagina Note.</p>
          </div>
        </div>
        <Button onClick={() => setBandDialog({ band: null })} className="min-h-11 gap-2 font-semibold">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuova band
        </Button>
      </header>

      {sortedBands.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Nessuna band" description="Crea la prima band, poi aggiungi le sue playlist." />
      ) : (
        <ul className="grid grid-cols-1 gap-6" aria-label="Band">
          {sortedBands.map((band) => {
            const own = playlistsOf(band.id);
            return (
              <li key={band.id}>
                <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/30 bg-primary/10">
                          {band.logoUrl ? <img src={band.logoUrl} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-6 w-6 text-primary" aria-hidden="true" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-bold">{band.name}</h3>
                          <p className="text-sm text-muted-foreground">{own.length} {own.length === 1 ? 'playlist' : 'playlist'}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <IconButton label={`Modifica la band ${band.name}`} className="text-muted-foreground hover:text-primary" onClick={() => setBandDialog({ band })}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Elimina la band ${band.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => setBandToDelete(band)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>

                    {own.length > 0 ? (
                      <ul className="space-y-2" aria-label={`Playlist di ${band.name}`}>
                        {own.map((playlist) => {
                          const count = songCount(playlist);
                          return (
                            <li key={playlist.id} className="flex items-center gap-2 rounded-xl border border-primary/20 bg-background/40 pl-1">
                              <Link
                                href={`/notes?view=${encodeURIComponent(playlist.id)}`}
                                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 hover:text-primary"
                              >
                                <ListMusic className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate font-semibold">{playlist.name}</span>
                                <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{count} {count === 1 ? 'brano' : 'brani'}</span>
                              </Link>
                              <IconButton label={`Rinomina la playlist ${playlist.name}`} className="text-muted-foreground hover:text-primary" onClick={() => setPlaylistDialog({ band, playlist })}>
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                              <IconButton label={`Elimina la playlist ${playlist.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => setPlaylistToDelete(playlist)}>
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Nessuna playlist per questa band.</p>
                    )}

                    <Button variant="outline" className="min-h-11 gap-2 border-primary/30 font-semibold text-primary" onClick={() => setPlaylistDialog({ band, playlist: null })}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Nuova playlist
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <BandDialog
        state={bandDialog}
        onOpenChange={(open) => { if (!open) setBandDialog(null); }}
        bands={bands}
        uploadLogo={async (file) => {
          if (!storage || !user) throw new Error('Storage non disponibile');
          const storageRef = ref(storage, `band-logos/${user.uid}/${Date.now()}_${file.name}`);
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 8000));
          await Promise.race([uploadBytes(storageRef, file), timeout]);
          return getDownloadURL(storageRef);
        }}
        onSave={async (band, name, logoUrl) => {
          if (band) await actions.updateBand(band, { name, logoUrl });
          else await actions.createBand(name, logoUrl ?? null);
          toast({ title: band ? 'Band aggiornata' : 'Band creata' });
        }}
      />

      <PlaylistDialog
        state={playlistDialog}
        onOpenChange={(open) => { if (!open) setPlaylistDialog(null); }}
        playlists={playlists}
        onSave={async (band, playlist, name) => {
          if (playlist) await actions.renamePlaylist(playlist, name);
          else await actions.createPlaylist(band.id, name);
          toast({ title: playlist ? 'Playlist rinominata' : 'Playlist creata', description: playlist ? undefined : 'Aggiungi i brani dalla pagina Note.' });
        }}
      />

      <ConfirmDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => { if (!open) setPlaylistToDelete(null); }}
        title={`Eliminare «${playlistToDelete?.name ?? ''}»?`}
        description={playlistToDelete ? `La playlist viene eliminata; i suoi ${songCount(playlistToDelete)} brani restano nel serbatoio e nelle altre playlist.` : undefined}
        confirmLabel="Elimina playlist"
        destructive
        onConfirm={async () => {
          if (!playlistToDelete) return;
          const target = playlistToDelete;
          setPlaylistToDelete(null);
          await actions.deletePlaylist(target);
          toast({ title: `Playlist «${target.name}» eliminata` });
        }}
      />

      <DeleteBandDialog
        band={bandToDelete}
        onOpenChange={(open) => { if (!open) setBandToDelete(null); }}
        bands={bands}
        playlistCount={bandToDelete ? playlistsOf(bandToDelete.id).length : 0}
        onConfirm={async (band, moveTo) => {
          setBandToDelete(null);
          await actions.deleteBand(band, moveTo);
          toast({ title: `Band «${band.name}» eliminata`, description: moveTo ? 'Le playlist sono state spostate.' : 'I brani restano nel serbatoio.' });
        }}
      />
    </div>
  );
}

function BandDialog({ state, onOpenChange, bands, uploadLogo, onSave }: {
  state: { band: Band | null } | null;
  onOpenChange: (open: boolean) => void;
  bands: Band[];
  uploadLogo: (file: File) => Promise<string>;
  onSave: (band: Band | null, name: string, logoUrl: string | null | undefined) => Promise<void>;
}) {
  const band = state?.band ?? null;
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    if (!state) return;
    setName(state.band?.name ?? '');
    setPreview(state.band?.logoUrl ?? '');
    setLogoFile(null);
    setRemoveLogo(false);
    setLogoError('');
  }, [state]);

  const duplicate = !!name.trim() && bands.some((b) => b.id !== band?.id && nameKey(b.name) === nameKey(name));

  const save = async () => {
    setSaving(true);
    try {
      let logoUrl: string | null | undefined = removeLogo ? null : undefined;
      if (logoFile) {
        try {
          logoUrl = await uploadLogo(logoFile);
        } catch {
          setLogoError('Logo non caricato: la band viene salvata senza il nuovo logo.');
        }
      }
      await onSave(band, name, logoUrl);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{band ? 'Modifica band' : 'Nuova band'}</DialogTitle>
          <DialogDescription>{band ? 'Cambia nome o logo della band.' : 'Le playlist della band si creano dopo, dalla sua scheda.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="band-name" className="text-sm font-semibold">Nome</label>
            <Input id="band-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoFocus />
            {duplicate && <p className="text-caption text-warning">Esiste già una band con questo nome.</p>}
          </div>
          <div className="space-y-2">
            <span className="text-sm font-semibold">Logo (facoltativo)</span>
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border/50 bg-muted/30">
                {preview ? <img src={preview} alt="Anteprima del logo" className="h-full w-full object-cover" /> : <Music2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
                {preview && (
                  <button type="button" aria-label="Togli il logo" onClick={() => { setPreview(''); setLogoFile(null); setRemoveLogo(true); }} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground">
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>
              <Input
                type="file"
                accept="image/*"
                aria-label="Scegli il logo"
                className="h-11 flex-1"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  setRemoveLogo(false);
                  const reader = new FileReader();
                  reader.onloadend = () => setPreview(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            {logoError && <p className="text-caption text-warning">{logoError}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button className="min-h-11 gap-2" disabled={!name.trim() || duplicate || saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {band ? 'Salva' : 'Crea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlaylistDialog({ state, onOpenChange, playlists, onSave }: {
  state: { band: Band; playlist: Playlist | null } | null;
  onOpenChange: (open: boolean) => void;
  playlists: Playlist[];
  onSave: (band: Band, playlist: Playlist | null, name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (state) setName(state.playlist?.name ?? ''); }, [state]);
  const duplicate = !!state && !!name.trim() && playlists.some((p) => p.bandId === state.band.id && p.id !== state.playlist?.id && nameKey(p.name) === nameKey(name));

  return (
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state?.playlist ? 'Rinomina playlist' : 'Nuova playlist'}</DialogTitle>
          <DialogDescription>{state ? `Band: ${state.band.name}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="playlist-name" className="text-sm font-semibold">Nome</label>
          <Input id="playlist-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoFocus />
          {duplicate && <p className="text-caption text-warning">Questa band ha già una playlist con questo nome.</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            className="min-h-11"
            disabled={!name.trim() || duplicate || saving}
            onClick={async () => {
              if (!state) return;
              setSaving(true);
              try { await onSave(state.band, state.playlist, name); onOpenChange(false); } finally { setSaving(false); }
            }}
          >
            {state?.playlist ? 'Salva' : 'Crea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DELETE_PLAYLISTS = '__delete__';

function DeleteBandDialog({ band, onOpenChange, bands, playlistCount, onConfirm }: {
  band: Band | null;
  onOpenChange: (open: boolean) => void;
  bands: Band[];
  playlistCount: number;
  onConfirm: (band: Band, moveToBandId: string | null) => void;
}) {
  const others = bands.filter((b) => b.id !== band?.id).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const [choice, setChoice] = useState<string>(DELETE_PLAYLISTS);
  useEffect(() => { setChoice(DELETE_PLAYLISTS); }, [band?.id]);

  return (
    <Dialog open={!!band} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Eliminare «{band?.name}»?</DialogTitle>
          <DialogDescription>
            {playlistCount > 0
              ? `La band ha ${playlistCount} playlist. Scegli cosa farne: i brani restano comunque nel serbatoio.`
              : 'La band non ha playlist. I brani non vengono toccati.'}
          </DialogDescription>
        </DialogHeader>
        {playlistCount > 0 && (
          <div className="space-y-2 py-2">
            <label className="text-sm font-semibold" id="delete-band-choice">Playlist della band</label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger aria-labelledby="delete-band-choice" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DELETE_PLAYLISTS}>Elimina anche le playlist</SelectItem>
                {others.map((b) => <SelectItem key={b.id} value={b.id}>Sposta in «{b.name}»</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button variant="destructive" className={cn('min-h-11')} onClick={() => band && onConfirm(band, choice === DELETE_PLAYLISTS ? null : choice)}>
            Elimina band
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
