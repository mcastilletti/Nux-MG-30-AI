'use client';

import React, { useState } from 'react';
import { Archive, Check, Loader2, MoreVertical, Pencil, Send, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/common/icon-button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { LibraryTabs } from '@/components/library/LibraryTabs';
import { SendToSlotDialog } from '@/components/library/SendToSlotDialog';
import { useSoundArchive } from '@/hooks/use-sound-archive';
import { useToast } from '@/hooks/use-toast';
import { MG30_MODELS } from '@/lib/mg30-data';
import { formatSlotLabel } from '@/lib/slot';
import { SOUND_ARCHIVE_SOURCE_LABEL, archivedSoundToPreset, renameArchivedSound, type ArchivedSound } from '@/lib/sound-archive';

const ampName = (sound: ArchivedSound) => {
  const amp = sound.preset.effects.find((e) => e.type === 'amp');
  return amp ? MG30_MODELS.amp.find((m) => m.id === amp.model)?.name ?? amp.model : '—';
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SoundArchivePage() {
  const { sounds, hydrated, save, remove, signedIn } = useSoundArchive();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<ArchivedSound | null>(null);
  const [toSend, setToSend] = useState<ArchivedSound | null>(null);

  const visible = sounds.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  const commitRename = async () => {
    if (!editing) return;
    const sound = sounds.find((s) => s.id === editing.id);
    setEditing(null);
    if (!sound || !editing.name.trim() || editing.name.trim() === sound.name) return;
    const result = await save(renameArchivedSound(sound, editing.name));
    if (result === 'local-error') toast({ title: 'Rinominato solo su questo dispositivo', description: 'Il salvataggio nel tuo account non è riuscito.', variant: 'destructive' });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const name = toDelete.name;
    const result = await remove(toDelete.id);
    setToDelete(null);
    toast({
      title: 'Suono eliminato',
      description: result === 'local-error' ? `'${name}' è stato tolto da questo dispositivo, ma non dal tuo account: riprova più tardi.` : `'${name}' non è più nell'Archivio suoni.`,
      variant: result === 'local-error' ? 'destructive' : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 py-1 md:space-y-7 md:py-2">
      <header className="space-y-4">
        <div>
          <p className="section-kicker mb-1">Preset manager</p>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Archivio suoni</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            I suoni messi da parte dall&apos;editor o tolti da uno slot. Puoi rimetterli in qualsiasi slot.
            {!signedIn && ' Sono salvati su questo dispositivo: accedi per averli nel tuo account.'}
          </p>
        </div>
        <LibraryTabs />
      </header>

      {!hydrated ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Caricamento…</div>
      ) : sounds.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-8 w-8" />}
          title="L'archivio è vuoto"
          description="Dall'editor usa “Salva in Archivio suoni”, oppure scegli “Archivia” quando sostituisci il suono di uno slot."
        />
      ) : (
        <>
          <Input placeholder="Cerca nell'archivio…" className="h-11" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cerca nell'archivio" />
          {visible.length === 0 ? (
            <EmptyState title="Nessun suono trovato" description={`Nessun nome contiene “${search}”.`} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
              {visible.map((sound) => (
                <Card key={sound.id} className="app-surface rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-label">{SOUND_ARCHIVE_SOURCE_LABEL[sound.source]}{sound.originSlot ? ` · ${formatSlotLabel(sound.originSlot)}` : ''}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton label={`Altre azioni su ${sound.name}`} variant="ghost"><MoreVertical className="h-4 w-4" /></IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => setEditing({ id: sound.id, name: sound.name })}><Pencil className="h-4 w-4" /> Rinomina</DropdownMenuItem>
                          <DropdownMenuItem className="min-h-11 gap-2 text-destructive" onSelect={() => setToDelete(sound)}><Trash2 className="h-4 w-4" /> Elimina</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {editing?.id === sound.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Input autoFocus value={editing.name} aria-label="Nuovo nome del suono" className="h-11"
                          onChange={(e) => setEditing({ id: sound.id, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(null); }} />
                        <IconButton label="Salva nome" onClick={commitRename}><Check className="h-4 w-4" /></IconButton>
                        <IconButton label="Annulla" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></IconButton>
                      </div>
                    ) : (
                      <CardTitle className="mt-2 truncate text-lg font-bold" title={sound.name}>{sound.name}</CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pb-4 text-sm">
                    <div className="text-label font-bold uppercase tracking-wider text-muted-foreground">Amplificatore</div>
                    <div className="font-medium">{ampName(sound)}</div>
                    <div className="mt-2 text-caption text-muted-foreground">Archiviato il {formatDate(sound.createdAt)}</div>
                  </CardContent>
                  <CardFooter className="border-t border-border/30 pt-3">
                    <Button variant="outline" className="min-h-11 w-full gap-2" onClick={() => setToSend(sound)}>
                      <Send className="h-4 w-4" /> Inserisci in uno slot
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => { if (!open) setToDelete(null); }}
        title={`Eliminare “${toDelete?.name}”?`}
        description="Il suono verrà tolto dall'Archivio e non sarà più recuperabile."
        confirmLabel="Elimina"
        destructive
        onConfirm={confirmDelete}
      />
      <SendToSlotDialog
        open={!!toSend}
        onOpenChange={(open) => { if (!open) setToSend(null); }}
        preset={toSend ? archivedSoundToPreset(toSend, toSend.originSlot ?? 1) : null}
        sourceLabel={toSend ? `Dall'Archivio suoni: ${toSend.name}` : ''}
        defaultSlot={toSend?.originSlot ?? undefined}
      />
    </div>
  );
}
