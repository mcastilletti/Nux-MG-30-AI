# Note in sala prove e dal vivo — requisiti di dettaglio

Riferimento per la skill `mg30-studio-ux`. Distingue ciò che **esiste** (verificato nel codice) da ciò che è **proposto** (da specificare e approvare prima di implementarlo). Analisi completa in `docs/audit-ux-frontend.md`.

## Cosa esiste oggi

| Funzione | Dove | Note |
|---|---|---|
| Brani (`type` assente o `'song'`) con sezioni, accordi, note generali, preset `presetSlot`/`presetScene` | `src/types/note.ts`, `NoteEditorContent.tsx` | Accordi con token speciali `NEWLINE` e `x2`…`x8` |
| Blocchi di testo libero (`type: 'block'`) | `BlockEditorContent.tsx` | |
| Band e scalette come stringhe sulla nota, ordine con `order` | `notes/page.tsx` | La pagina Band usa collezioni separate `bands`/`setlists` non lette dall'editor note |
| Foglio a schermo intero (Radix Dialog), stato nell'URL `?openNote=&noteKind=` | `NoteSheet.tsx`, `note-sheet-state.ts` | Escape e click fuori bloccati in modifica |
| Lettura predefinita, modifica con la matita | `NoteEditorContent.tsx` | Accordi 20px, testo sezione 16px |
| "Successivo" nella stessa band+scaletta | `note-navigation.ts` | Nessun "precedente", nessuna posizione "3/12" |
| Invio del preset collegato all'apertura (Program Change + scena) | `NoteEditorContent.tsx` `loadNote` | Avviene anche con ▶, Annulla e primo salvataggio |
| Schermo sempre acceso | `src/hooks/use-wake-lock.ts` | Globale, senza indicatore |
| Cache locale delle note | `use-notes-cache.ts` (`mg30-notes-cache`) | Lettura possibile senza rete; scritture su Firestore (persistenza offline IndexedDB attiva, comportamento UI offline da verificare) |
| Salvataggio esplicito | pulsante Salva | Nessun autosave, nessun controllo modifiche non salvate |

**Non esistono** (non presumerli): modalità Live, testo regolabile, auto-scroll, swipe, controllo da pedale, "precedente", indicatore di stato del salvataggio, protezione delle modifiche non salvate.

## Scenari di accettazione

| # | Scenario | Oggi | Test |
|---|---|---|---|
| 1 | Aprire rapidamente la nota pertinente durante una prova | Possibile da lista filtrata o ricerca | Playwright: da `/notes` con cache iniettata, nota aperta in ≤2 tocchi dalla scaletta filtrata |
| 2 | Leggere senza zoom e senza cercare il testo | Parziale: accordi 20px, testo 16px, zoom disabilitato globalmente | Misura dimensioni e contrasto a 360px; lettura a ~1m su dispositivo |
| 3 | Passare al brano successivo | Esiste ▶ (44px in alto a destra); nessun precedente | Playwright: ▶ apre il brano con `order` successivo e lo scroll riparte dall'inizio |
| 4 | Modificare un appunto e vedere che è salvato | Solo toast; nessuno stato persistente | Da progettare: stato di salvataggio visibile; test sullo stato |
| 5 | Interruzione o navigazione accidentale senza perdita | **Fallisce**: X, Indietro e Annulla perdono le modifiche | Da progettare: conferma su uscita con modifiche; test su reducer e Playwright |
| 6 | Uso su smartphone piccolo | Da verificare | Playwright a 360×740 e 390×844, nessuna sovrapposizione né scroll orizzontale |
| 7 | Consultazione con luce variabile | Solo tema scuro | Misure di contrasto; verifica su dispositivo in luce intensa e al buio |
| 8 | Tastiera, dialoghi, barre e contenuti non si sovrappongono | Da verificare (foglio alto `100vh`) | Dispositivo reale iOS e Android con tastiera aperta |
| 9 | Errore di salvataggio o assenza di rete | Toast di errore, modifiche mantenute; offline da verificare | Test con rete disattivata: messaggio veritiero, nessuna perdita |

## Requisiti per la lettura in prova (proposta)

- Titolo su massimo 2 righe, non troncato.
- Barra inferiore nella zona del pollice: `◀ Prec` · posizione `3/12` · `Succ ▶`, comandi ≥48px.
- Al cambio brano lo scroll torna in cima e i pannelli di dettaglio tornano allo stato iniziale.
- Chip del preset collegato (`03B · S2`) con stato dell'invio visibile, così l'invio MIDI non è mai silenzioso.
- Posizioni degli accordi consultabili con un tocco (popover), non solo con tooltip.

## Requisiti per la modalità Live (proposta, da approvare)

- Avvio esplicito dalla scaletta filtrata ("Avvia live"), dal primo brano o da quello selezionato.
- Sola lettura: nessun comando di modifica o di eliminazione raggiungibile.
- Testo regolabile A−/A+ con preferenza per dispositivo; base proposta: accordi 28px, testo 22px.
- Alto contrasto: il colore della sezione è una barra laterale con etichetta, non il colore del testo.
- Blocco anti-tocco: uscire richiede una pressione prolungata o una conferma.
- Navigazione con tasti freccia, PagSu/PagGiù e Spazio, così funzionano i pedali Bluetooth "page turner".
- Indicatore che lo schermo resta acceso (wake lock) e avviso se non è disponibile.
- Schermo intero facoltativo (Fullscreen API), mai obbligatorio.
- Fuori ambito finché non richiesti: auto-scroll, swipe tra brani, controllo dalla pedaliera via MIDI.

## Requisiti per la modifica sicura (proposta)

- Rilevamento delle modifiche non salvate rispetto all'ultima versione caricata.
- Stato di salvataggio fisso e visibile: Non salvato / Salvataggio… / Salvato / Errore – Riprova.
- Conferma per X, Indietro di sistema (foglio chiuso con la cronologia del browser, non con `replaceState`) e "Annulla" quando ci sono modifiche.
- Salva disabilitato durante il salvataggio, per evitare documenti doppi.
- Nessun salvataggio possibile se la nota non è stata caricata (protezione da sovrascrittura con campi vuoti).
- Rimozione di accordi e sezioni con target ≥44px e annullamento immediato.
- Campo attivo sempre visibile con la tastiera aperta (`dvh`, `visualViewport`).

## Decisioni aperte collegate

- Invio automatico del preset: quando deve avvenire (apertura, ▶, Live) e se deve essere disattivabile.
- Zoom: riattivare il pinch-zoom o compensare con la dimensione regolabile.
- Approvazione della modalità Live e delle sue componenti (schermo intero, pedale Bluetooth, blocco anti-tocco).
