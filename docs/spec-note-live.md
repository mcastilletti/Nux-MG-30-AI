# Specifica — Note in prova e dal vivo (Fase 3)

Stato: **proposta da approvare** (2026-10-25). Prototipo statico: `docs/prototypes/note-live.html`.

Base: audit `docs/audit-ux-frontend.md` §8 e skill `mg30-studio-ux` (`references/live-notes.md`).

## 1. Decisioni che la specifica applica

- **D2:**
  - il preset si invia all'apertura del brano, solo con l'interruttore acceso, e con ▶;
  - mai su Annulla o Salva.
  - Già implementato.
- **D3:**
  - il pinch-zoom resta bloccato;
  - in compenso c'è un testo regolabile per dispositivo, in lettura e in Live.
- **D4:**
  - modalità Live con schermo intero facoltativo, avanzamento a tocco e blocco anti-tocco;
  - **nessun supporto dedicato ai pedali Bluetooth**.

**Formato dei dati invariato:**
- `SavedNote` non cambia e non serve nessuna migrazione;
- solo preferenze locali nuove in `localStorage`, elencate al §7.

## 2. Lettura in prova (foglio nota, sola lettura)

| ID | Requisito | Note |
|---|---|---|
| L1 | Titolo su **massimo 2 righe**, mai troncato a una (E10) | Il testo intero resta nel `title` |
| L2 | **Barra inferiore** nella zona del pollice: `◀ Prec` · `3 / 12` · `Succ ▶`, comandi ≥48px | Sostituisce la freccia in alto. Prec/Succ disattivati agli estremi. Visibile solo con band e scaletta della nota |
| L3 | `getPreviousNoteInSetlist` accanto a `getNextNoteInSetlist` in `note-navigation.ts`, con test | Stesso criterio: band + scaletta + `order` |
| L4 | **Chip del preset** sotto il titolo: `03B · S2` + stato | Stati: *Inviato* (verde), *Pedaliera non collegata* (grigio), *Non inviato: invio automatico spento* (grigio). Il tocco sul chip equivale a ▶ |
| L5 | Al cambio brano: scroll in cima (fatto, NT8) e dettagli chiusi | — |
| L6 | **Accordi consultabili al tocco** (NT12): un popover con le posizioni sostituisce il tooltip | In lettura il tocco sull'accordo apre il popover; nessuna azione distruttiva |
| L7 | **Testo regolabile A− / A+** nel menu ⋮ del foglio: 5 livelli (90%–150%), base accordi 20px e testo 16px | Preferenza per dispositivo, condivisa con Live (§3) |

## 3. Modalità Live

**Avvio:**
- dal pulsante **"▶ Avvia live"**, visibile nella lista quando sono selezionate band e scaletta;
- parte dal primo brano, oppure dal brano aperto se si avvia dal menu ⋮ del foglio.

**Stato nell'URL:** `?openNote=<id>&noteKind=song&live=1`. Ricaricando la pagina si resta in Live sullo stesso brano.

| ID | Requisito | Note |
|---|---|---|
| V1 | **Sola lettura**: nessun pulsante di modifica, eliminazione, copia o impostazioni | La matita non esiste in Live |
| V2 | **Testo grande**: base accordi 28px, testo 22px, regolabile A−/A+ (stessa preferenza di L7) | Interlinea ≥1,4; nessun testo sotto 16px |
| V3 | **Alto contrasto**: testo quasi bianco su fondo nero; il colore della sezione è una **barra laterale** con etichetta, non il colore del testo | Contrasto testo ≥7:1 |
| V4 | **Barra inferiore** `◀ Prec` · `3 / 12` · `Succ ▶`, comandi alti 64px | Avanzare equivale ad aprire il brano: si applica D2 |
| V5 | **Intestazione minima**: posizione, titolo (2 righe), chip del preset, indicatore schermo acceso, pulsante blocco | — |
| V6 | **Blocco anti-tocco**: con il blocco attivo restano attivi solo Prec/Succ; per uscire o sbloccare serve una **pressione prolungata di 1 s** sul lucchetto, con anello di avanzamento | Nessun tocco singolo esce dalla Live |
| V7 | **Schermo acceso**: indicatore "Schermo sempre acceso" se il wake lock è attivo, avviso se non è disponibile | Usa `use-wake-lock.ts` |
| V8 | **Schermo intero facoltativo** dal menu (Fullscreen API), mai obbligatorio | Su iOS Safari la Fullscreen API non è disponibile: il pulsante non compare |
| V9 | **Uscita**: "Esci dalla Live" (pressione prolungata se bloccata) torna al foglio in lettura sullo stesso brano | Indietro di sistema: esce dalla Live senza chiudere il foglio |
| V10 | **Blocchi di testo** (`type: 'block'`) mostrati in Live con lo stesso testo grande | — |

## 4. Modifica sicura

Già fatto (Fasi 0–2):
- conferma all'uscita con modifiche (NT2);
- protezione dalla sovrascrittura (NT3);
- guardia contro il doppio salvataggio e `SaveStatus` (NT17);
- Indietro che chiude passando dalla conferma;
- messaggio offline (§5).

| ID | Requisito | Note |
|---|---|---|
| M1 | **Ordine degli accordi** (NT11): dopo ogni scelta il punto di inserimento avanza, quindi G poi Gm danno "G, Gm" | Test unitario sull'indice di inserimento |
| M2 | **Rimozione di accordi e sezioni** (NT9): X ≥44px; dopo la rimozione un toast con **"Annulla"** ripristina l'elemento | Nessuna conferma modale: l'annullamento basta |
| M3 | **Controlli sempre visibili in modifica** (NT10): inserisci accordo, inserisci sezione e rimuovi a capo non dipendono dall'hover | Su touch l'hover non esiste |
| M4 | **Campo attivo visibile con la tastiera**: al focus `scrollIntoView` del campo, altezza del foglio da `visualViewport` | Da verificare su iOS e Android reali |

## 5. Offline

- **Lettura:** dalla cache locale. Esiste già.
- **Scrittura:** con la cache di Firestore attiva la scrittura resta in coda sul dispositivo. La sua promise però si risolve solo con la conferma del server.
  - **Implementato in questa fase:** senza rete, o senza conferma entro 8 s, il salvataggio si chiude con il messaggio "Salvata sul dispositivo. Verrà sincronizzata con il tuo account appena torna la connessione." (`src/lib/firestore-write.ts`).
  - Prima il pulsante restava su "Salvataggio…" senza fine.
- **Indicatore offline** nell'intestazione del foglio: "Offline: lettura dalla copia sul dispositivo".
- Se il server poi rifiuta una scrittura in coda (es. sessione scaduta) l'errore finisce solo nel log. È un limite noto: va mostrato quando si introdurrà uno stato di sincronizzazione globale (fuori ambito).

## 6. Scenari di accettazione

| # | Scenario | Comportamento atteso | Test |
|---|---|---|---|
| 1 | Aprire rapidamente la nota | Dalla scaletta filtrata, ≤2 tocchi; in Live il brano successivo con un tocco | Playwright: lista → nota; Live → Succ |
| 2 | Leggere senza zoom | Prova: accordi ≥20px, testo ≥16px, regolabili. Live: 28/22px. Contrasto ≥7:1 in Live | Misura automatica di dimensioni e contrasto a 360px; lettura a circa 1 m su dispositivo |
| 3 | Brano successivo e precedente | Prec/Succ nella barra inferiore; posizione corretta; scroll in cima | Playwright: ordine, estremi disattivati, `scrollTop = 0` |
| 4 | Modificare e vedere che è salvato | `SaveStatus` in modifica, messaggio dopo il salvataggio | Test dei componenti + Playwright (in parte già presenti) |
| 5 | Interruzione senza perdita | Conferma su X, Annulla e Indietro; avviso del browser su ricarica | Playwright NT2 (esistente, 15 controlli) |
| 6 | Smartphone piccolo | Nessuna sovrapposizione né scroll orizzontale a 360×740 e 390×844, anche in Live con testo al 150% | Baseline Playwright + nuovo caso Live |
| 7 | Luce variabile | Live ad alto contrasto; nessun testo sotto 4,5:1 in prova | Misura di contrasto + dispositivo al buio e in luce intensa |
| 8 | Tastiera e barre | Il campo attivo resta visibile; la barra inferiore si nasconde in modifica | Dispositivo iOS e Android reali |
| 9 | Rete assente o errore | Offline: "Salvata sul dispositivo…", editor chiuso, nessuna perdita. Errore: "Salvataggio non riuscito" e modifiche conservate | Test unitari di `awaitWrite` (fatti) + verifica manuale con rete disattivata e account |

## 7. Preferenze locali nuove

| Chiave | Valori | Uso |
|---|---|---|
| `mg30-notes-auto-send` | `on` / `off` | Esiste già (D2) |
| `mg30-notes-text-scale` | `0.9`, `1`, `1.15`, `1.3`, `1.5` | L7, V2 |
| `mg30-live-locked` | `on` / `off` | V6: ricorda il blocco tra un brano e l'altro |

## 8. Fuori ambito

- Pedali Bluetooth (D4).
- Auto-scroll.
- Swipe tra brani.
- Controllo delle note dalla pedaliera via MIDI.
- Unificazione band/scalette (D7).
- Tema chiaro (D6).
- Stato di sincronizzazione globale.

## 9. Implementazione (Fase 5), in passi verificabili

1. `getPreviousNoteInSetlist` + posizione `n / N` (test unitari) → barra inferiore in lettura (L2, L3).
2. Preferenza di scala del testo + menu ⋮ con A−/A+ (L7).
3. Chip del preset con stato (L4) e popover degli accordi (L6).
4. Modalità Live (V1–V10) dentro `NoteSheet`, con `live=1` nell'URL; test Playwright degli scenari 1, 3, 6.
5. Modifica sicura M1–M3 (test unitari + Playwright); M4 da verificare su dispositivo.
6. Indicatore offline nel foglio.
