# Specifica — Brani in un serbatoio unico, scalette come playlist (Fasi 6.2–6.4)

Stato: **bozza da approvare** (2026-10-26). Richiesta dell'utente, sostituisce la decisione aperta D7 (unificazione band/scalette).

## 1. Obiettivo

**Oggi:**
- ogni nota (brano o blocco) appartiene a **una sola** scaletta, tramite i campi di testo `band`, `setlist` e `order`;
- per usare lo stesso brano in due scalette bisogna duplicarlo, e le copie poi divergono.

**Domani:**
- tutti i brani e i blocchi stanno in un **serbatoio unico**;
- ogni **playlist** (la scaletta di oggi) è un elenco ordinato di riferimenti ai brani del serbatoio;
- un brano può stare in più playlist;
- si duplica solo quando serve una **versione** diversa.

Decisioni dell'utente (2026-10-26):

| # | Decisione |
|---|---|
| P1 | **Serbatoio unico, senza band.** Le playlist appartengono a una band, come le scalette di oggi. Lo stesso brano può stare in playlist di band diverse |
| P2 | **I blocchi stanno nel serbatoio** come i brani e si possono mettere in più playlist |
| P3 | **Migrazione:** si uniscono solo i duplicati **identici** (stesso titolo e stesso contenuto). Se differiscono restano due brani, cioè due versioni |

## 2. Modello dati

**Nota** (`notes/{id}`, invariata nei campi di contenuto):
- è il brano o blocco del serbatoio: `title`, `sections`, `generalNotes`, `presetSlot`, `presetScene`, `type`, `blockContent`, `userId`, `updatedAt`;
- i campi `band`, `setlist` e `order` **non vengono più letti né scritti**. Restano nei documenti esistenti, intatti, per poter tornare indietro;
- nuovo campo facoltativo `mergedInto?: string`, impostato dalla migrazione su un duplicato identico. Un duplicato così marcato è nascosto ovunque.

**Playlist** (documenti esistenti `setlists/{id}`, collezione già coperta dalle regole Firestore):

```ts
interface Playlist {
  id: string;
  name: string;
  bandId: string;          // band di appartenenza (collezione `bands`)
  userId: string;
  noteIds: string[];       // ordine della playlist; un brano compare al massimo una volta
  createdAt?: unknown;
  updatedAt?: unknown;
}
```

**Regole:**
- **Ordine:** l'ordine di una playlist è l'ordine di `noteIds`. Riordinare scrive un solo documento, non N note.
- **Niente doppioni:** lo stesso brano non può stare due volte nella stessa playlist. Per rifare un brano dal vivo c'è la scelta libera (V11).
- **Eliminare una playlist** non elimina i brani.
- **Eliminare un brano:** lo toglie dal serbatoio e da tutte le playlist, dopo una conferma che dice in quante playlist si trova.

**Indicatore di versione del modello:** `users/{uid}/settings/notesModel` = `{ version: 2, migratedAt }`. Le regole lo coprono già (`settings/{document}`).

**Cache locale:**
- `mg30-notes-cache` contiene il serbatoio, come oggi;
- una nuova voce `mg30-playlists-cache` contiene band e playlist, per la lettura offline.

## 3. Migrazione (una volta per account)

Funzione pura `migrateToPlaylists(notes, bands, setlists)`, coperta da test, che restituisce un piano di scritture. Un esecutore poi applica il piano in batch.

1. **Band:** ogni nome di band usato nelle note e assente dalla collezione `bands` diventa un documento band. "Senza Band" diventa la band "Senza band".
2. **Playlist:** ogni coppia (band, scaletta) delle note diventa una playlist, riusando il documento `setlists` con lo stesso nome e la stessa band se esiste già.
   - `noteIds` segue l'`order` attuale, e a parità d'ordine il titolo.
   - Anche le scalette create nella pagina Band e ancora vuote diventano playlist vuote.
3. **Duplicati identici (P3):**
   - **Criterio di identità:** stesso titolo (normalizzato: spazi e maiuscole), stesso `type`, stessi `sections`/`blockContent`, `generalNotes`, `presetSlot` e `presetScene`.
   - Per ogni gruppo di identici resta la nota modificata più di recente; le altre ricevono `mergedInto`.
   - Nelle playlist il riferimento punta alla nota rimasta.
4. **Nessuna cancellazione e nessuna modifica del contenuto:** si aggiungono solo documenti e campi.
5. **Idempotenza:**
   - la migrazione parte solo senza il marcatore `version: 2`;
   - se si interrompe, al riavvio ricalcola il piano da capo e riusa le playlist già create, con stesso nome e band.
6. **Riepilogo:** al termine un toast riporta quante playlist sono state create e quanti duplicati uniti, per esempio "3 playlist, 2 duplicati uniti".
7. **Offline:** la migrazione richiede la rete. Senza rete la lista resta in sola lettura con il modello vecchio e un avviso.

## 4. Interfaccia (pagina Note)

**Barra in alto:** il filtro attuale band → scaletta diventa **band → playlist**, con una voce in più, **"Tutti i brani"** (il serbatoio).

| ID | Requisito | Note |
|---|---|---|
| PL1 | **Vista serbatoio** ("Tutti i brani"): brani e blocchi in ordine alfabetico, ricerca, filtro Brani/Blocchi; ogni riga mostra le playlist in cui il brano compare (chip, al massimo 2 più "+N") | È la vista predefinita senza band |
| PL2 | **Vista playlist:** ordine della playlist, riordino con le maniglie (scrive `noteIds`), numero di posizione | Come la lista di scaletta di oggi |
| PL3 | **"Aggiungi brani"** nella vista playlist: foglio con ricerca e selezione multipla dal serbatoio; i brani già presenti risultano spuntati e disattivati; i nuovi vanno in coda | Pulsante principale della vista playlist |
| PL4 | **"Togli dalla playlist"** nel menu della riga (vista playlist): non elimina il brano; toast con **Annulla** | Nessuna conferma modale |
| PL5 | **"Elimina brano"** (vista serbatoio e foglio): conferma "È in N playlist: verrà tolto da tutte" | `ConfirmDialog` |
| PL6 | **"Aggiungi a playlist…"** dal menu della riga e dal foglio del brano: elenco delle playlist raggruppate per band, con spunte modificabili | Sostituisce l'attuale "Copia in band/scaletta" |
| PL7 | **"Crea versione"** dal foglio del brano: duplica il brano ("Titolo (versione 2)") e, se aperto da una playlist, chiede se sostituire l'originale **in quella playlist** | Unico caso in cui si duplica |
| PL8 | **Avviso di condivisione** in modifica: "Questo brano è in 3 playlist: le modifiche valgono per tutte" con il link "Crea versione" | Solo se le playlist sono 2 o più |
| PL9 | **Nuovo brano o blocco:** creato da una playlist va nel serbatoio e in coda alla playlist; creato da "Tutti i brani" va solo nel serbatoio | Il foglio non chiede più band e scaletta |
| PL10 | **Navigazione e Live per playlist:** Prec/Succ, posizione `n / N`, elenco alfabetico (V11), "Avvia live" e invio del preset (D2) seguono la playlist da cui si è aperto il brano | Nell'URL `playlist=<id>` accanto a `openNote`; senza playlist (dal serbatoio) niente barra Prec/Succ |
| PL11 | **Importazione JSON:** il brano entra nel serbatoio e, se aperta, nella playlist corrente; i campi `band`/`setlist` del JSON, se presenti, aggiungono il brano a quella playlist creandola se manca. **Esportazione PDF:** segue l'ordine della playlist | Compatibile con i file esistenti |

## 5. Pagina Band

- La pagina gestisce **band e playlist**: crea, rinomina ed elimina; per ogni playlist mostra il numero di brani.
- Si tolgono le scalette "derivate dalle note" (`isFromNotes`): dopo la migrazione esistono come documenti veri.
- Rinominare una playlist cambia un solo documento, mentre oggi serve un batch su tutte le note.
- Eliminare una band chiede cosa fare delle sue playlist; i brani restano comunque nel serbatoio.

## 6. Fuori ambito

- Brani condivisi tra utenti diversi.
- Lo stesso brano due volte nella stessa playlist.
- Cronologia delle versioni di un brano.
- Rimozione definitiva dei campi `band`/`setlist`/`order` e dei duplicati `mergedInto`: si farà dopo un periodo di prova.

## 7. Rischi

- **Dati reali in Firestore:** la migrazione scrive sull'account vero.
  - Mitigazioni: nessuna cancellazione, piano calcolato da funzione pura e testato, marcatore di versione, riepilogo.
  - Va **provata su un account reale con un backup**: export JSON delle note dalla pagina Note prima dell'aggiornamento.
- **Due dispositivi:** se un dispositivo con la versione vecchia scrive una nota dopo la migrazione, quella nota avrà solo `band`/`setlist`.
  - All'avvio, con il marcatore presente, le note senza playlist e non unite compaiono nel serbatoio e restano raggiungibili.
  - Dopo il rilascio basta aggiornare la PWA.
- **Pagina orfana `/notes/editor` (N6):** scrive ancora il modello vecchio. Va rimossa in questa fase, ed è la proposta per D5 su questa pagina.

## 8. Verifica

- **Test unitari:**
  - migrazione: duplicati identici e diversi, ordine, band mancanti, scalette vuote, idempotenza, note nuove dopo la migrazione;
  - operazioni sulle playlist: aggiungi, togli, riordina, sostituisci con una versione, eliminazione di un brano condiviso;
  - posizione e navigazione per playlist.
- **Playwright**, con serbatoio e playlist iniettati in cache:
  - PL1–PL11;
  - Live e V11 su due playlist che condividono un brano;
  - nessuna regressione negli scenari Note esistenti (`check-live`, `check-f3a`, `check-f3b`, `check-nt2`, `check-nt3`, `check-d1d2`).
- **Manuale (Fase 7)**, con account Google reale: backup, migrazione, riepilogo, due playlist con un brano comune, modifica condivisa, creazione di una versione.
