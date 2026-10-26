"use client"

import React, { useState, useMemo, useEffect, useRef, useReducer, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotebookPen, Plus, Trash2, GripVertical, Music2, Layers, Printer, Copy, ArrowRight, FileText, Search, X, Loader2, Play, MoreVertical, Download, CopyMinus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { buildNotesBackup, notesBackupFileName } from '@/lib/notes-backup';
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NoteSheet } from '@/components/notes/NoteSheet';
import { NoteEditorContent } from '@/components/notes/NoteEditorContent';
import { BlockEditorContent } from '@/components/notes/BlockEditorContent';
import { useNotesCache } from '@/stores/use-notes-cache';
import {
  getNoteSheetStateFromSearchParams,
  initialNoteSheetState,
  NOTE_SHEET_KIND_PARAM,
  NOTE_SHEET_LIVE_PARAM,
  NOTE_SHEET_OPEN_PARAM,
  noteSheetReducer,
} from '@/components/notes/note-sheet-state';
import type { NoteSection, SavedNote } from '@/types/note';
import { getSetlistAlphabetical, getSetlistPosition } from '@/components/notes/note-navigation';
import { LiveNoteView } from '@/components/notes/LiveNoteView';
import { SetlistNavBar } from '@/components/notes/setlist-nav-bar';
import { GUARD_HISTORY_RESTORED_EVENT } from '@/hooks/use-unsaved-changes-guard';
import { formatSlotLabel } from '@/lib/slot';
import { SECTION_COLORS } from '@/lib/section-colors';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ToastAction } from '@/components/ui/toast';
import { NOTE_SHEET_PLAYLIST_PARAM } from '@/components/notes/note-sheet-state';
import { PlaylistLibrary } from '@/components/notes/playlist/PlaylistLibrary';
import { AddToPlaylistsDialog } from '@/components/notes/playlist/AddToPlaylistsDialog';
import { ContentDuplicatesDialog } from '@/components/notes/playlist/ContentDuplicatesDialog';
import type { ContentMergePlan } from '@/lib/content-duplicates';
import { ConversionBanner } from '@/components/notes/playlist/ConversionBanner';
import { usePlaylistsCache } from '@/stores/use-playlists-cache';
import { usePlaylistActions } from '@/hooks/use-playlist-actions';
import { addNotes, effectivePreset, findItem, getPlaylistAlphabetical, getPlaylistPosition, indexNotes, moveItem, playlistEntries, playlistsContaining, removeNote, replaceNote, restoreItem } from '@/lib/playlist-ops';
import { buildVersionNote, matchesQuery, nextVersionTitle, poolNotes } from '@/lib/playlist-view';
import { nameKey } from '@/lib/playlist-migration';
import { awaitWrite, isOnline } from '@/lib/firestore-write';
import { setDoc } from 'firebase/firestore';
import type { Playlist } from '@/types/playlist';


const FILTER_BAND_KEY = 'mg30_notes_filter_band';
const FILTER_SETLIST_KEY = 'mg30_notes_filter_setlist';
// Modello a playlist: band e playlist scelte (per id).
const FILTER_PL_BAND_KEY = 'mg30_notes_filter_band_id';
const FILTER_PL_PLAYLIST_KEY = 'mg30_notes_filter_playlist';

function NotesLibraryContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading: userLoading } = useUser();
  const { notes: cachedNotes, setNotes, updateNote, addNote, deleteNote } = useNotesCache();
  
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

  const [noteSheet, dispatchNoteSheet] = useReducer(noteSheetReducer, initialNoteSheetState);
  const { isOpen: isSheetOpen, noteId: selectedNoteId, editorKind } = noteSheet;
  const hasRestoredNoteSheet = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newBlockInitialBand, setNewBlockInitialBand] = useState<string | null>(null);
  const [newBlockInitialSetlist, setNewBlockInitialSetlist] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SavedNote[]>([]);

  const [isImportJsonDialogOpen, setIsImportJsonDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importJsonError, setImportJsonError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const scrollToId = searchParams.get('scrollTo');

  // Modello a playlist (spec playlist): attivo dopo la conversione dell'account.
  const marker = usePlaylistsCache((state) => state.marker);
  const playlists = usePlaylistsCache((state) => state.playlists);
  const playlistBands = usePlaylistsCache((state) => state.bands);
  const model: 'legacy' | 'playlists' = marker && marker.version >= 2 ? 'playlists' : 'legacy';
  const isPlaylistModel = model === 'playlists';
  const playlistActions = usePlaylistActions();
  const [plBandId, setPlBandId] = useState<string | null>(null);
  const [plPlaylistId, setPlPlaylistId] = useState<string | null>(null);
  const [addToNote, setAddToNote] = useState<SavedNote | null>(null);
  const [versionPrompt, setVersionPromptState] = useState<{ original: SavedNote; created: SavedNote; playlist: Playlist; fromDraft?: boolean } | null>(null);
  // Il dialogo chiama sia la conferma sia la chiusura: il ref garantisce una sola risoluzione.
  const versionPromptRef = useRef<typeof versionPrompt>(null);
  const setVersionPrompt = (value: typeof versionPrompt) => { versionPromptRef.current = value; setVersionPromptState(value); };
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const notesById = useMemo(() => indexNotes(cachedNotes), [cachedNotes]);
  const currentPlaylist = isPlaylistModel && plPlaylistId ? playlists.find((p) => p.id === plPlaylistId) ?? null : null;
  const sheetPlaylist = isPlaylistModel && noteSheet.playlistId ? playlists.find((p) => p.id === noteSheet.playlistId) ?? null : null;

  useEffect(() => {
    if (!hasRestoredNoteSheet.current) {
      hasRestoredNoteSheet.current = true;
      const restoredState = getNoteSheetStateFromSearchParams(
        new URLSearchParams(window.location.search),
      );

      if (restoredState) {
        dispatchNoteSheet({
          type: 'open',
          noteId: restoredState.noteId,
          editorKind: restoredState.editorKind,
          live: restoredState.live,
          playlistId: restoredState.playlistId,
        });
      }
      return;
    }

    const syncUrl = () => {
      const url = new URL(window.location.href);
      if (noteSheet.isOpen) {
        url.searchParams.set(NOTE_SHEET_OPEN_PARAM, noteSheet.noteId ?? '');
        url.searchParams.set(NOTE_SHEET_KIND_PARAM, noteSheet.editorKind);
        if (noteSheet.live) url.searchParams.set(NOTE_SHEET_LIVE_PARAM, '1');
        else url.searchParams.delete(NOTE_SHEET_LIVE_PARAM);
        if (noteSheet.playlistId) url.searchParams.set(NOTE_SHEET_PLAYLIST_PARAM, noteSheet.playlistId);
        else url.searchParams.delete(NOTE_SHEET_PLAYLIST_PARAM);
      } else {
        url.searchParams.delete(NOTE_SHEET_OPEN_PARAM);
        url.searchParams.delete(NOTE_SHEET_KIND_PARAM);
        url.searchParams.delete(NOTE_SHEET_LIVE_PARAM);
        url.searchParams.delete(NOTE_SHEET_PLAYLIST_PARAM);
      }
      if (url.href !== window.location.href) {
        window.history.replaceState(window.history.state, '', url);
      }
    };
    syncUrl();
    // L'editor in modifica aggiunge e rimuove una voce di cronologia per gestire
    // il tasto Indietro: quando la rimuove, l'URL deve restare allineato al foglio.
    // Non si ascolta ogni popstate, per non riscrivere l'URL della pagina precedente.
    window.addEventListener(GUARD_HISTORY_RESTORED_EVENT, syncUrl);
    return () => window.removeEventListener(GUARD_HISTORY_RESTORED_EVENT, syncUrl);
  }, [noteSheet]);

  useEffect(() => {
    const savedBand = localStorage.getItem(FILTER_BAND_KEY);
    const savedSetlist = localStorage.getItem(FILTER_SETLIST_KEY);
    if (savedBand && savedBand !== 'all') setSelectedBand(savedBand);
    if (savedSetlist && savedSetlist !== 'all') setSelectedSetlist(savedSetlist);
    try {
      setPlBandId(localStorage.getItem(FILTER_PL_BAND_KEY) || null);
      setPlPlaylistId(localStorage.getItem(FILTER_PL_PLAYLIST_KEY) || null);
    } catch { /* preferenza facoltativa */ }
    // Link dalla pagina Band: /notes?view=<playlist> apre direttamente quella playlist.
    const view = new URLSearchParams(window.location.search).get('view');
    if (view) {
      const target = usePlaylistsCache.getState().playlists.find((p) => p.id === view);
      setPlBandId(target?.bandId ?? null);
      setPlPlaylistId(view);
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);

  useEffect(() => {
    try {
      if (plBandId) localStorage.setItem(FILTER_PL_BAND_KEY, plBandId); else localStorage.removeItem(FILTER_PL_BAND_KEY);
      if (plPlaylistId) localStorage.setItem(FILTER_PL_PLAYLIST_KEY, plPlaylistId); else localStorage.removeItem(FILTER_PL_PLAYLIST_KEY);
    } catch { /* preferenza facoltativa */ }
  }, [plBandId, plPlaylistId]);

  // Band, playlist e marcatore della conversione dall'account (anche per accorgersi
  // di una conversione fatta da un altro dispositivo).
  useEffect(() => {
    if (userLoading || !user) return;
    playlistActions.refresh().catch((error) => console.warn('[playlist] caricamento non riuscito', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

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

  // Stato del caricamento da Firestore (NT21): distingue caricamento, errore e lista vuota.
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadAttempt, setLoadAttempt] = useState(0);

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
      setLoadState('loading');
      try {
        const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
        const sorted = notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setNotes(sorted);
        setLoadState('idle');
      } catch (error) {
        console.error('Error loading notes:', error);
        setLoadState('error');
        toast({ title: "Errore caricamento note", variant: "destructive" });
      }
    };

    loadNotes();
  }, [user, userLoading, firestore, cachedNotes.length, setNotes, loadAttempt]);

  const filteredNotes = useMemo(() => {
    let notesToFilter = [...cachedNotes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (selectedBand) notesToFilter = notesToFilter.filter(n => n.band === selectedBand);
    if (selectedSetlist) notesToFilter = notesToFilter.filter(n => n.setlist === selectedSetlist);
    if (searchQuery) notesToFilter = notesToFilter.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return notesToFilter;
  }, [cachedNotes, selectedBand, selectedSetlist, searchQuery]);

  // Prec/Succ, posizione ed elenco alfabetico: dalla scaletta (modello vecchio) o
  // dalla playlist da cui è stato aperto il brano (PL10).
  const setlistPosition = useMemo(
    () => (isPlaylistModel ? getPlaylistPosition(sheetPlaylist, notesById, selectedNoteId) : getSetlistPosition(cachedNotes, selectedNoteId)),
    [isPlaylistModel, sheetPlaylist, notesById, cachedNotes, selectedNoteId],
  );
  const setlistEntries = useMemo(
    () => (isPlaylistModel ? getPlaylistAlphabetical(sheetPlaylist, notesById, selectedNoteId) : getSetlistAlphabetical(cachedNotes, selectedNoteId)),
    [isPlaylistModel, sheetPlaylist, notesById, cachedNotes, selectedNoteId],
  );
  const livePreset = isPlaylistModel && selectedNoteId && notesById.get(selectedNoteId)
    ? effectivePreset(notesById.get(selectedNoteId)!, findItem(sheetPlaylist, selectedNoteId))
    : null;
  // L'editor segnala solo i cambi di modalità: chiudendo il foglio (o passando
  // alla Live, dove l'editor non è montato) lo stato di modifica va azzerato,
  // altrimenti la barra Prec/Succ resterebbe nascosta.
  useEffect(() => {
    if (!isSheetOpen || noteSheet.live) setIsEditing(false);
  }, [isSheetOpen, noteSheet.live]);
  // Brani della scaletta selezionata nell'ordine reale, per "Avvia live" (ignora la ricerca).
  const liveSetlist = useMemo(() => {
    if (!selectedBand || !selectedSetlist) return [];
    return cachedNotes
      .filter(n => n.band === selectedBand && n.setlist === selectedSetlist)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [cachedNotes, selectedBand, selectedSetlist]);

  const openNoteInSheet = (note: SavedNote | null) => {
    if (!note) return;
    dispatchNoteSheet({ type: 'open', noteId: note.id, editorKind: note.type === 'block' ? 'block' : 'song', playlistId: isPlaylistModel ? noteSheet.playlistId : undefined });
  };

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
    if (isPlaylistModel) {
      const target = noteToDelete;
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
      if (selectedNoteId === target.id) dispatchNoteSheet({ type: 'close' });
      const ok = await playlistActions.deleteNoteEverywhere(target);
      if (ok) toast({ title: target.type === 'block' ? 'Blocco eliminato' : 'Brano eliminato' });
      return;
    }
    try {
      await deleteDoc(doc(firestore, "notes", noteToDelete.id));
      deleteNote(noteToDelete.id);
      toast({ title: "Nota eliminata" });
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (err) { toast({ title: "Errore eliminazione", variant: "destructive" }); }
  };

  // Il riordino ha senso solo dentro una scaletta e senza ricerca: in una vista
  // filtrata gli indici non corrispondono all'ordine reale dei brani.
  const canReorder = !!selectedSetlist && !searchQuery.trim();

  function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;
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

  // --- Modello a playlist (PL2–PL7) ---
  const requestDelete = (note: SavedNote) => { setNoteToDelete(note); setIsDeleteDialogOpen(true); };

  const handleRemoveFromPlaylist = async (playlist: Playlist, note: SavedNote) => {
    const { playlist: next, removed } = removeNote(playlist, note.id);
    if (!removed) return;
    await playlistActions.savePlaylist(next);
    toast({
      title: `«${note.title}» tolto da «${playlist.name}»`,
      description: 'Il brano resta nel serbatoio.',
      action: (
        <ToastAction altText="Annulla" onClick={() => {
          const latest = usePlaylistsCache.getState().playlists.find((p) => p.id === playlist.id);
          if (latest) playlistActions.savePlaylist(restoreItem(latest, removed.item, removed.index));
        }}>Annulla</ToastAction>
      ),
    });
  };

  const handleApplyPlaylists = async (note: SavedNote, add: string[], remove: string[]) => {
    const all = usePlaylistsCache.getState().playlists;
    for (const id of add) { const p = all.find((x) => x.id === id); if (p) await playlistActions.savePlaylist(addNotes(p, [note.id])); }
    for (const id of remove) { const p = all.find((x) => x.id === id); if (p) await playlistActions.savePlaylist(removeNote(p, note.id).playlist); }
    toast({ title: 'Playlist aggiornate', description: `«${note.title}»: ${add.length ? `aggiunto a ${add.length}` : ''}${add.length && remove.length ? ', ' : ''}${remove.length ? `tolto da ${remove.length}` : ''}.` });
  };

  /** PL7: duplica il brano; se aperto da una playlist che lo contiene, chiede se sostituirlo lì. */
  const handleCreateVersion = async (note: SavedNote, options?: { fromDraft?: boolean }) => {
    const title = nextVersionTitle(note.title, useNotesCache.getState().notes.map((n) => n.title));
    const data = buildVersionNote(note, title);
    const ref = doc(collection(firestore, 'notes'));
    const created = { ...data, id: ref.id, userId: user?.uid } as SavedNote;
    if (user) {
      try {
        await awaitWrite(setDoc(ref, { ...data, userId: user.uid, updatedAt: serverTimestamp() }), { online: isOnline() });
      } catch {
        toast({ title: 'Versione non creata', description: 'Controlla la connessione e riprova.', variant: 'destructive' });
        return;
      }
    }
    addNote(created);
    const playlist = sheetPlaylist && sheetPlaylist.items.some((i) => i.noteId === note.id) ? sheetPlaylist : null;
    if (playlist) {
      setVersionPrompt({ original: note, created, playlist, fromDraft: options?.fromDraft });
    } else {
      dispatchNoteSheet({ type: 'open', noteId: created.id, editorKind: created.type === 'block' ? 'block' : 'song' });
      toast({ title: `Creata «${title}»`, description: options?.fromDraft ? 'Contiene le modifiche in corso; l\'originale resta com\'era. È nel serbatoio.' : 'È nel serbatoio: aggiungila alle playlist dal menu ⋮.' });
    }
  };

  const resolveVersionPrompt = async (replace: boolean) => {
    const pending = versionPromptRef.current;
    if (!pending) return;
    const { original, created, playlist } = pending;
    setVersionPrompt(null);
    if (replace) {
      const latest = usePlaylistsCache.getState().playlists.find((p) => p.id === playlist.id) ?? playlist;
      await playlistActions.savePlaylist(replaceNote(latest, original.id, created.id));
    }
    dispatchNoteSheet({ type: 'open', noteId: created.id, editorKind: created.type === 'block' ? 'block' : 'song', playlistId: replace ? playlist.id : undefined });
    toast({ title: `Creata «${created.title}»`, description: `${replace ? `Ha preso il posto dell'originale in «${playlist.name}».` : 'È nel serbatoio.'}${pending.fromDraft ? ' Le modifiche in corso sono nella nuova versione; l\'originale resta com\'era.' : ''}` });
  };

  /** PL11: il brano importato va nella playlist aperta, oppure in quella indicata nel JSON (creata se manca). */
  const addImportedToPlaylist = async (noteId: string, bandName: string, playlistName: string) => {
    if (currentPlaylist) { await playlistActions.savePlaylist(addNotes(currentPlaylist, [noteId])); return currentPlaylist.name; }
    if (!nameKey(bandName) || !nameKey(playlistName)) return null;
    const state = usePlaylistsCache.getState();
    const band = state.bands.find((b) => nameKey(b.name) === nameKey(bandName)) ?? await playlistActions.createBand(bandName.replace(/\s+/g, ' ').trim());
    const existing = usePlaylistsCache.getState().playlists.find((p) => p.bandId === band.id && nameKey(p.name) === nameKey(playlistName));
    if (existing) { await playlistActions.savePlaylist(addNotes(existing, [noteId])); return existing.name; }
    const created = await playlistActions.createPlaylist(band.id, playlistName.replace(/\s+/g, ' ').trim(), [noteId]);
    return created.name;
  };

  const [isExportingBackup, setIsExportingBackup] = useState(false);

  /** Backup JSON di tutte le note, band e scalette (prima della conversione a playlist). */
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const handleMergeDuplicates = async (plan: ContentMergePlan) => {
    const ok = await playlistActions.mergeContentDuplicates(plan);
    if (!ok) return;
    const changed = plan.playlists.length;
    toast({
      title: `${plan.deleteIds.length} ${plan.deleteIds.length === 1 ? 'nota eliminata' : 'note eliminate'}`,
      description: changed ? `${changed} ${changed === 1 ? 'playlist aggiornata' : 'playlist aggiornate'} con le note tenute.` : undefined,
    });
  };

  const handleExportBackup = async () => {
    if (isExportingBackup) return;
    setIsExportingBackup(true);
    try {
      let file;
      try {
        if (!user || (typeof navigator !== 'undefined' && navigator.onLine === false)) throw new Error('offline');
        const byUser = (name: string) => getDocs(query(collection(firestore, name), where('userId', '==', user.uid)));
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
        const [notesSnap, bandsSnap, setlistsSnap] = await Promise.race([Promise.all([byUser('notes'), byUser('bands'), byUser('setlists')]), timeout]);
        file = buildNotesBackup({
          notes: notesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedNote)),
          bands: bandsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          setlists: setlistsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          source: 'cloud',
        });
      } catch {
        // Senza rete (o senza account): copia sul dispositivo, senza band e scalette della pagina Band.
        file = buildNotesBackup({ notes: useNotesCache.getState().notes, source: 'device' });
      }
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = notesBackupFileName(file);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
      const { songs, blocks, setlists } = file.counts;
      toast({
        title: 'Backup delle note scaricato',
        description: file.source === 'cloud'
          ? `${songs} brani e ${blocks} blocchi, ${setlists} scalette della pagina Band, nel file ${a.download}.`
          : `${songs} brani e ${blocks} blocchi dalla copia sul dispositivo, senza band e scalette della pagina Band (account non raggiungibile), nel file ${a.download}.`,
      });
    } finally {
      setIsExportingBackup(false);
    }
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

  const handleImportFromJson = async () => {
    setImportJsonError('');
    let parsed: any;
    try {
      parsed = JSON.parse(importJsonText.trim());
    } catch (e) {
      setImportJsonError('JSON non valido. Controlla la sintassi.');
      return;
    }

    // Validate required fields
    if (!parsed.title || typeof parsed.title !== 'string') {
      setImportJsonError('Campo "title" mancante o non valido.');
      return;
    }

    if (!user) {
      setImportJsonError('Devi essere autenticato.');
      return;
    }

    // Normalize sections: add unique IDs if missing
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const validTypes = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Strum', 'Out', 'Solo'];
    const typeAliases: Record<string, string> = { 'Outro': 'Out' };
    const sections: NoteSection[] = rawSections.map((s: any, idx: number) => {
      const normalizedType = typeAliases[s.type] ?? s.type;
      return {
        id: `section-${Date.now()}-${idx}-${Math.random()}`,
        type: validTypes.includes(normalizedType) ? normalizedType : 'Verse',
        text: typeof s.text === 'string' ? s.text : '',
        chords: Array.isArray(s.chords) ? s.chords.map(String) : [],
      };
    });

    const allNotes = useNotesCache.getState().notes;
    const newOrder = allNotes.length > 0 ? Math.max(...allNotes.map(n => n.order ?? 0)) + 1 : 0;

    const newNote = {
      title: parsed.title,
      // Nel modello a playlist band e scaletta del JSON indicano solo la playlist di destinazione.
      band: !isPlaylistModel && typeof parsed.band === 'string' ? parsed.band : '',
      setlist: !isPlaylistModel && typeof parsed.setlist === 'string' ? parsed.setlist : '',
      generalNotes: typeof parsed.generalNotes === 'string' ? parsed.generalNotes : '',
      presetSlot: typeof parsed.presetSlot === 'string' ? parsed.presetSlot : '',
      presetScene: typeof parsed.presetScene === 'string' ? parsed.presetScene : '',
      sections,
      order: newOrder,
      updatedAt: serverTimestamp(),
      userId: user.uid,
      type: 'song' as const,
    };

    setIsImporting(true);
    try {
      const docRef = await addDoc(collection(firestore, 'notes'), newNote);
      const createdNote = { ...newNote, id: docRef.id } as SavedNote;
      addNote(createdNote);
      const into = isPlaylistModel
        ? await addImportedToPlaylist(docRef.id, typeof parsed.band === 'string' ? parsed.band : '', typeof parsed.setlist === 'string' ? parsed.setlist : '')
        : null;
      toast({ title: `Brano "${newNote.title}" importato con successo!`, description: into ? `Aggiunto in coda a «${into}».` : undefined });
      setIsImportJsonDialogOpen(false);
      setImportJsonText('');
      setImportJsonError('');
      // Open the newly created note
      dispatchNoteSheet({ type: 'open', noteId: docRef.id, editorKind: 'song', playlistId: isPlaylistModel ? currentPlaylist?.id : undefined });
    } catch (e) {
      setImportJsonError('Errore durante il salvataggio. Riprova.');
    } finally {
      setIsImporting(false);
    }
  };

  // Stampa (PDF): la scaletta filtrata, oppure la playlist aperta nel suo ordine.
  const printNotes = isPlaylistModel
    ? (currentPlaylist ? playlistEntries(currentPlaylist, notesById).map((e) => e.note).filter((n) => matchesQuery(n, searchQuery)) : poolNotes(cachedNotes, { query: searchQuery }))
    : filteredNotes;
  const canPrint = isPlaylistModel ? !!currentPlaylist && printNotes.length > 0 : !!selectedSetlist && filteredNotes.length > 0;
  const deleteCount = isPlaylistModel && noteToDelete ? playlistsContaining(playlists, noteToDelete.id).length : 0;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8 py-8 pb-20 px-2 md:px-0 no-print">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
              <NotebookPen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase">Archivio Note</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                // Chiudere la ricerca azzera anche il filtro, che altrimenti resterebbe invisibile.
                if (isSearchOpen) setSearchQuery('');
                setIsSearchOpen(!isSearchOpen);
              }}
              variant="outline"
              size="icon"
              aria-label={isSearchOpen ? 'Chiudi ricerca' : 'Cerca brano'}
              aria-expanded={isSearchOpen}
              className="h-11 w-11 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Search className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Altre azioni sulle note" className="h-11 w-11 border-primary/30 text-primary hover:bg-primary/10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="min-h-11 gap-2" disabled={!canPrint} onSelect={() => setTimeout(handleExportPdf, 150)}>
                  <Printer className="h-4 w-4" /> {isPlaylistModel ? 'Stampa la playlist (PDF)' : 'Stampa la scaletta (PDF)'}
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11 gap-2" disabled={isExportingBackup || (!user && cachedNotes.length === 0)} onSelect={handleExportBackup}>
                  <Download className="h-4 w-4" /> Esporta backup (JSON)
                </DropdownMenuItem>
                {isPlaylistModel && (
                  <DropdownMenuItem className="min-h-11 gap-2" disabled={cachedNotes.length === 0} onSelect={() => setTimeout(() => setDuplicatesOpen(true), 150)}>
                    <CopyMinus className="h-4 w-4" /> Unisci note identiche…
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
                      dispatchNoteSheet({ type: 'open', noteId: null, editorKind: 'song', playlistId: isPlaylistModel ? currentPlaylist?.id : undefined });
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
                      dispatchNoteSheet({ type: 'open', noteId: 'new-block', editorKind: 'block', playlistId: isPlaylistModel ? currentPlaylist?.id : undefined });
                      setIsAddMenuOpen(false);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Nuovo Blocco
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 h-10"
                    onClick={() => {
                      setImportJsonText('');
                      setImportJsonError('');
                      setIsImportJsonDialogOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Importa da JSON
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
            {!isPlaylistModel && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-auto">
                {searchResults.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      dispatchNoteSheet({ type: 'open', noteId: note.id, editorKind: note.type === 'block' ? 'block' : 'song' });
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
                      <Badge variant="outline" className="flex h-6 shrink-0 items-center gap-1.5 border-primary/20 bg-primary/10 px-2 text-label font-black text-primary">
                        <span>{formatSlotLabel(parseInt(note.presetSlot))}</span>
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

        {!isPlaylistModel && user && (
          <ConversionBanner onBackup={handleExportBackup} backupDownloaded={backupDownloaded} />
        )}

        {isPlaylistModel ? (
          <PlaylistLibrary
            notes={cachedNotes}
            playlists={playlists}
            bands={playlistBands}
            bandId={plBandId}
            playlistId={currentPlaylist?.id ?? null}
            onBandChange={setPlBandId}
            onPlaylistChange={setPlPlaylistId}
            searchQuery={searchQuery}
            highlightedId={selectedNoteId ?? scrollToId}
            onOpen={(note, playlistId) => dispatchNoteSheet({ type: 'open', noteId: note.id, editorKind: note.type === 'block' ? 'block' : 'song', playlistId })}
            onStartLive={(note, playlistId) => dispatchNoteSheet({ type: 'open', noteId: note.id, editorKind: note.type === 'block' ? 'block' : 'song', live: true, playlistId })}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onAddToPlaylists={setAddToNote}
            onDelete={requestDelete}
            onReorder={(playlist, from, to) => playlistActions.savePlaylist(moveItem(playlist, from, to))}
            onAddSongs={(playlist, ids) => {
              playlistActions.savePlaylist(addNotes(playlist, ids));
              toast({ title: `${ids.length} ${ids.length === 1 ? 'brano aggiunto' : 'brani aggiunti'} a «${playlist.name}»` });
            }}
            emptyState={
              loadState === 'loading' ? <EmptyState icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Caricamento dei brani…" />
                : loadState === 'error' ? <ErrorState title="Brani non caricati" description="Controlla la connessione e riprova." onRetry={() => setLoadAttempt(n => n + 1)} />
                : !userLoading && !user ? <EmptyState icon={<Music2 className="h-10 w-10" />} title="Accedi per vedere i tuoi brani" description="Le note si salvano nel tuo account: accedi con Google dal menu laterale." />
                : undefined
            }
          />
        ) : (<>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-card/40 p-3 rounded-2xl border border-border shadow-sm">
          <Select value={selectedBand || 'all'} onValueChange={(v) => { setSelectedBand(v === 'all' ? null : v); setSelectedSetlist(null); }}>
            <SelectTrigger aria-label="Filtra per band" className="h-11 bg-background/50 border-border text-[14px] font-bold"><SelectValue placeholder="Tutte le band" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le band</SelectItem>
              {bands.map(band => <SelectItem key={band} value={band}>{band}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSetlist || 'all'} onValueChange={(v) => setSelectedSetlist(v === 'all' ? null : v)} disabled={!selectedBand}>
            <SelectTrigger aria-label="Filtra per scaletta" className="h-11 bg-background/50 border-border text-[14px] font-bold"><SelectValue placeholder="Tutte le scalette" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le scalette</SelectItem>
              {setlists.map(setlist => <SelectItem key={setlist} value={setlist}>{setlist}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {liveSetlist.length > 0 && (
          <Button
            className="min-h-12 w-full gap-2 text-base font-bold"
            onClick={() => {
              const first = liveSetlist[0];
              dispatchNoteSheet({ type: 'open', noteId: first.id, editorKind: first.type === 'block' ? 'block' : 'song', live: true });
            }}
          >
            <Play className="h-5 w-5" aria-hidden="true" /> Avvia live · {liveSetlist.length} {liveSetlist.length === 1 ? 'brano' : 'brani'}
          </Button>
        )}

        <div className="space-y-2">
          {filteredNotes.length === 0 ? (
            cachedNotes.length === 0 && loadState === 'loading' ? (
              <EmptyState icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Caricamento dei brani…" />
            ) : cachedNotes.length === 0 && loadState === 'error' ? (
              <ErrorState title="Brani non caricati" description="Controlla la connessione e riprova." onRetry={() => setLoadAttempt(n => n + 1)} />
            ) : cachedNotes.length === 0 && !userLoading && !user ? (
              <EmptyState icon={<Music2 className="h-10 w-10" />} title="Accedi per vedere i tuoi brani" description="Le note si salvano nel tuo account: accedi con Google dal menu laterale." />
            ) : (
              <EmptyState
                icon={<Music2 className="h-10 w-10" />}
                title="Nessun brano"
                description={cachedNotes.length > 0 ? 'Nessun brano corrisponde ai filtri o alla ricerca.' : 'Aggiungi il primo brano con il pulsante +.'}
              />
            )
          ) : (
            <>
            {!canReorder && (
              <p className="px-1 text-xs text-muted-foreground">Seleziona band e scaletta (senza ricerca attiva) per riordinare i brani.</p>
            )}
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
                        dispatchNoteSheet({ type: 'open', noteId: note.id, editorKind: note.type === 'block' ? 'block' : 'song' });
                      }}
                      ref={(el) => { if(el) noteRefs.current[note.id] = el; }}
                      isHighlighted={note.id === (selectedNoteId ?? scrollToId)}
                      canReorder={canReorder}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            </>
          )}
        </div>
        </>)}
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
                    <SelectTrigger aria-label="Band di destinazione" className="h-11 text-[14px]"><SelectValue placeholder="Scegli band..." /></SelectTrigger>
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
                    <SelectTrigger aria-label="Scaletta di destinazione" className="h-11 text-[14px]"><SelectValue placeholder="Scegli scaletta..." /></SelectTrigger>
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
            <DialogDescription>
              {deleteCount > 0
                ? `È in ${deleteCount} ${deleteCount === 1 ? 'playlist' : 'playlist'}: verrà tolto da tutte. Questa azione non può essere annullata.`
                : 'Sei sicuro di voler eliminare questo brano? Questa azione non può essere annullata.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog */}
      <Dialog open={isImportJsonDialogOpen} onOpenChange={(open) => { setIsImportJsonDialogOpen(open); if (!open) { setImportJsonText(''); setImportJsonError(''); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importa brano da JSON</DialogTitle>
            <DialogDescription>
              Incolla il JSON del brano. Campi supportati: <code className="text-primary">title</code>, <code className="text-primary">band</code>, <code className="text-primary">setlist</code>, <code className="text-primary">generalNotes</code>, <code className="text-primary">sections</code> (array con <code className="text-primary">type</code>, <code className="text-primary">text</code>, <code className="text-primary">chords</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea
              value={importJsonText}
              onChange={(e) => { setImportJsonText(e.target.value); setImportJsonError(''); }}
              placeholder={`{\n  "title": "Nome Brano",\n  "band": "Nome Band",\n  "sections": [...]\n}`}
              className="font-mono text-xs min-h-[200px] resize-y bg-background/50"
              spellCheck={false}
            />
            {importJsonError && (
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <span>⚠️</span> {importJsonError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportJsonDialogOpen(false)}>Annulla</Button>
            <Button
              onClick={handleImportFromJson}
              disabled={!importJsonText.trim() || isImporting}
            >
              {isImporting ? 'Importazione...' : 'Importa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContentDuplicatesDialog
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        notes={cachedNotes}
        playlists={playlists}
        bands={playlistBands}
        onBackup={handleExportBackup}
        onApply={handleMergeDuplicates}
      />

      <AddToPlaylistsDialog
        note={addToNote}
        onOpenChange={(open) => { if (!open) setAddToNote(null); }}
        playlists={playlists}
        bands={playlistBands}
        onApply={handleApplyPlaylists}
      />

      <ConfirmDialog
        open={!!versionPrompt}
        onOpenChange={(open) => { if (!open) resolveVersionPrompt(false); }}
        title={`Sostituire in «${versionPrompt?.playlist.name ?? ''}»?`}
        description={versionPrompt ? `«${versionPrompt.created.title}» è stata creata. Vuoi che prenda il posto di «${versionPrompt.original.title}» in «${versionPrompt.playlist.name}»? Le altre playlist restano con l'originale.` : undefined}
        confirmLabel="Sostituisci"
        cancelLabel="Solo nel serbatoio"
        onConfirm={() => resolveVersionPrompt(true)}
      />

      <div className="hidden print:block print-only">
        {printNotes.map((note) => (
          <div key={`print-${note.id}`} className="print-song-page">
            <h1 className="print-title">{note.title}</h1>
            
            <div className="print-subtitle">
               <span>{isPlaylistModel ? (currentPlaylist?.name ?? 'Tutti i brani') : `${note.band} - ${note.setlist}`}</span>
               {(() => {
                 const preset = isPlaylistModel ? effectivePreset(note, findItem(currentPlaylist, note.id)) : { presetSlot: note.presetSlot ?? '', presetScene: note.presetScene ?? '' };
                 return preset.presetSlot ? <span>PRESET MG-30: {preset.presetSlot} {preset.presetScene ? `(S${parseInt(preset.presetScene) + 1})` : ''}</span> : null;
               })()}
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

      <NoteSheet
        isOpen={isSheetOpen}
        onClose={() => dispatchNoteSheet({ type: 'close' })}
        disableGestures={isEditing || noteSheet.live}
        contentKey={selectedNoteId}
        footer={!isEditing && setlistPosition && (setlistPosition.total > 1 || noteSheet.live) ? (
          <SetlistNavBar
            size={noteSheet.live ? 'live' : 'rehearsal'}
            className={noteSheet.live ? 'border-zinc-800 bg-zinc-950' : undefined}
            index={setlistPosition.index}
            total={setlistPosition.total}
            onPrevious={setlistPosition.previous ? () => openNoteInSheet(setlistPosition.previous) : undefined}
            onNext={setlistPosition.next ? () => openNoteInSheet(setlistPosition.next) : undefined}
            entries={setlistEntries}
            onPick={(note) => openNoteInSheet(note)}
          />
        ) : null}
      >
        {noteSheet.live && selectedNoteId ? (
          <LiveNoteView
            noteId={selectedNoteId}
            position={setlistPosition ? { index: setlistPosition.index, total: setlistPosition.total } : null}
            onExit={() => dispatchNoteSheet({ type: 'exit-live' })}
            preset={livePreset}
          />
        ) : editorKind === 'block' ? (
          <BlockEditorContent
            noteId={selectedNoteId}
            initialBand={newBlockInitialBand}
            initialSetlist={newBlockInitialSetlist}
            onClose={() => {
              dispatchNoteSheet({ type: 'close' });
              setNewBlockInitialBand(null);
              setNewBlockInitialSetlist(null);
            }}
            onEditModeChange={setIsEditing}
            onStartLive={() => dispatchNoteSheet({ type: 'enter-live' })}
            model={model}
            playlistId={noteSheet.playlistId}
            onAddToPlaylists={setAddToNote}
            onDeleteNote={requestDelete}
            onUpdate={(note: SavedNote) => {
              if (selectedNoteId && selectedNoteId !== 'new-block') {
                updateNote(note);
              } else {
                addNote(note);
                dispatchNoteSheet({ type: 'saved', noteId: note.id, editorKind: 'block' });
              }
            }}
          />
        ) : (
          <NoteEditorContent
            noteId={selectedNoteId}
            onClose={() => dispatchNoteSheet({ type: 'close' })}
            onEditModeChange={setIsEditing}
            onStartLive={() => dispatchNoteSheet({ type: 'enter-live' })}
            model={model}
            playlistId={noteSheet.playlistId}
            onAddToPlaylists={setAddToNote}
            onCreateVersion={handleCreateVersion}
            onDeleteNote={requestDelete}
            onUpdate={(note: SavedNote) => {
              if (selectedNoteId) {
                updateNote(note);
              } else {
                addNote(note);
                dispatchNoteSheet({ type: 'saved', noteId: note.id, editorKind: 'song' });
              }
            }}
          />
        )}
      </NoteSheet>
    </>
  );
}

const SortableNoteCard = React.memo(React.forwardRef<HTMLDivElement, {
  note: SavedNote;
  index: number;
  onDelete: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent, note: SavedNote) => void;
  onClick: () => void;
  isHighlighted?: boolean;
  canReorder: boolean;
}>(({ note, index, onDelete, onCopy, onClick, isHighlighted, canReorder }, ref) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id, disabled: !canReorder });
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
        {canReorder ? (
          <div {...attributes} {...listeners} aria-label={`Trascina per riordinare ${note.title}`} className="flex h-full cursor-grab touch-none items-center justify-center px-1 text-muted-foreground/30 hover:text-primary active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-2 shrink-0" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0 pl-3">
          {note.type === 'block' ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="break-words text-[16px] font-black uppercase leading-tight text-primary">{note.title}</CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0 no-print">
                 <Button variant="ghost" size="icon" aria-label="Copia nota" className="h-9 w-9 text-primary opacity-30 transition-opacity group-hover:opacity-100" onClick={(e) => onCopy(e, note)}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Elimina nota" className="h-9 w-9 text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
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
                  <Button variant="ghost" size="icon" aria-label="Elimina nota" className="h-9 w-9 text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-label text-muted-foreground uppercase font-bold">{note.band}</span>
                <span className="text-label text-muted-foreground opacity-30">•</span>
                <span className="text-label text-muted-foreground uppercase font-bold">{note.setlist}</span>
                {note.presetSlot && (
                  <>
                    <span className="text-label text-muted-foreground opacity-30">•</span>
                    <span className="text-label uppercase font-bold text-primary">
                      {formatSlotLabel(parseInt(note.presetSlot))}
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
