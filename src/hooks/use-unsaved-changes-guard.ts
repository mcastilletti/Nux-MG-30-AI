"use client";

import { useEffect, useRef } from 'react';

/** Emesso dopo che la guardia ha rimosso la propria voce dalla cronologia. */
export const GUARD_HISTORY_RESTORED_EVENT = 'mg30:guard-history-restored';

/**
 * Protegge un editor aperto:
 * - con `editing` attivo aggiunge una voce nella cronologia, così il tasto Indietro
 *   di sistema chiama `onBack` invece di lasciare la pagina;
 * - con `dirty` attivo chiede conferma prima di ricaricare o chiudere la scheda.
 */
export function useUnsavedChangesGuard({ editing, dirty, onBack }: { editing: boolean; dirty: boolean; onBack: () => void }) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!editing) return;
    window.history.pushState(window.history.state, '', window.location.href);
    let armed = true;
    const handlePopState = () => {
      if (!armed) return;
      window.history.pushState(window.history.state, '', window.location.href);
      onBackRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      armed = false;
      window.removeEventListener('popstate', handlePopState);
      // Rimuove la voce aggiunta all'ingresso in modifica e avvisa chi deve
      // riallineare l'URL della voce su cui si torna.
      const handleRestored = () => {
        window.removeEventListener('popstate', handleRestored);
        window.dispatchEvent(new Event(GUARD_HISTORY_RESTORED_EVENT));
      };
      window.addEventListener('popstate', handleRestored);
      window.history.back();
    };
  }, [editing]);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);
}
