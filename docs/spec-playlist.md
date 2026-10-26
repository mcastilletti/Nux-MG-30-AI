# Specifica — Brani in un serbatoio unico, scalette come playlist (Fasi 6.2–6.4)

Stato: **realizzata** (Fasi 6.2–6.4, 2026-10-26; conversione eseguita dall'utente sul proprio account), con il preset per playlist (P4) e le correzioni emerse dalla prova sul backup reale (§9). Richiesta dell'utente, sostituisce la decisione aperta D7 (unificazione band/scalette).

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
| P4 | **Preset per playlist:** il brano ha un preset predefinito; ogni playlist può impostarne uno proprio per quel brano. Nella migrazione due copie che differiscono **solo** per il preset diventano un brano unico, e ogni playlist conserva il preset della sua copia |
| P5 | **"Senza Scaletta" non diventa una playlist:** quelle note restano solo nel serbatoio. I nomi di band e scalette perdono gli spazi superflui ("EMERALD " = "EMERALD") |

## 2. Modello dati

**Nota** (`notes/{id}`, invariata nei campi di contenuto):
- è il brano o blocco del serbatoio: `title`, `sections`, `generalNotes`, `presetSlot`, `presetScene`, `type`, `blockContent`, `userId`, `updatedAt`;
- `presetSlot`/`presetScene` sono il **preset predefinito** del brano, usato quando il brano è aperto dal serbatoio o quando la playlist non ne imposta uno proprio;
- i campi `band`, `setlist` e `order` **non vengono più letti né scritti**. Restano nei documenti esistenti, intatti, per poter tornare indietro;
- nuovo campo facoltativo `mergedInto?: string`, impostato dalla migrazione su un duplicato identico. Un duplicato così marcato è nascosto ovunque.

**Playlist** (documenti esistenti `setlists/{id}`, collezione già coperta dalle regole Firestore):

```ts
interface Playlist {
  id: string;
  name: string;
  bandId: string;          // band di appartenenza (collezione `bands`)
  userId: string;
  items: PlaylistItem[];   // ordine della playlist; un brano compare al massimo una volta
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PlaylistItem {
  noteId: string;
  presetSlot?: string;     // preset proprio della playlist (P4); assente = predefinito del brano
  presetScene?: string;
}
```

**Regole:**
- **Ordine:** l'ordine di una playlist è l'ordine di `items`. Riordinare scrive un solo documento, non N note.
- **Preset effettivo:** quello dell'elemento della playlist se impostato, altrimenti quello del brano. Vale per il chip del preset, ▶, l'invio automatico (D2) e la Live.
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
   - I nomi vengono confrontati senza spazi superflui (P5).
   - "Senza Scaletta" (o scaletta vuota) non diventa una playlist: quelle note restano solo nel serbatoio (P5).
   - `items` segue l'`order` attuale, e a parità d'ordine il titolo.
   - Anche le scalette create nella pagina Band e ancora vuote diventano playlist vuote.
3. **Duplicati (P3, P4):**
   - **Criterio:** stesso titolo (normalizzato: spazi e maiuscole), stesso `type`, stessi `sections` (ignorando gli id delle sezioni), `blockContent` e `generalNotes` (ignorando spazi iniziali/finali e a capo Windows). Il preset **non** conta.
   - Per ogni gruppo resta la nota modificata più di recente, con il suo preset come predefinito; le altre ricevono `mergedInto`.
   - Nelle playlist il riferimento punta alla nota rimasta; se la copia originale aveva un preset diverso dal predefinito, l'elemento della playlist lo conserva come preset proprio. Il comportamento di ogni playlist resta quindi identico a prima.
4. **Nessuna cancellazione e nessuna modifica del contenuto:** si aggiungono solo documenti e campi.
5. **Avvio manuale:**
   - la conversione **non parte da sola**;
   - finché manca il marcatore, la pagina Note mostra l'avviso *"Nuova organizzazione a playlist"* con due pulsanti, **Scarica backup** e **Converti**;
   - **Converti** chiede conferma e ricorda il backup se non è stato scaricato in questa sessione.
6. **Idempotenza:**
   - la migrazione parte solo senza il marcatore `version: 2`;
   - se si interrompe, al riavvio ricalcola il piano da capo e riusa le playlist già create, con stesso nome e band.
7. **Riepilogo:** al termine un toast riporta quante playlist sono state create e quanti duplicati uniti, per esempio "3 playlist, 2 duplicati uniti".
8. **Offline:** la conversione richiede la rete; senza rete **Converti** è disattivato e la lista resta con il modello vecchio.

## 4. Interfaccia (pagina Note)

**Barra in alto:** il filtro attuale band → scaletta diventa **band → playlist**, con una voce in più, **"Tutti i brani"** (il serbatoio).

| ID | Requisito | Note |
|---|---|---|
| PL1 | **Vista serbatoio** ("Tutti i brani"): brani e blocchi in ordine alfabetico, ricerca, filtro Brani/Blocchi; ogni riga mostra le playlist in cui il brano compare (chip, al massimo 2 più "+N") | È la vista predefinita senza band. Con una band scelta diventa **"Tutti i brani della band"**: solo i brani presenti in almeno una sua playlist |
| PL2 | **Vista playlist:** ordine della playlist, riordino con le maniglie (scrive `items`), numero di posizione | Come la lista di scaletta di oggi |
| PL3 | **"Aggiungi brani"** nella vista playlist: foglio con ricerca e selezione multipla dal serbatoio; i brani già presenti risultano spuntati e disattivati; i nuovi vanno in coda | Pulsante principale della vista playlist |
| PL4 | **"Togli dalla playlist"** nel menu della riga (vista playlist): non elimina il brano; toast con **Annulla** | Nessuna conferma modale |
| PL5 | **"Elimina brano"** (vista serbatoio e foglio): conferma "È in N playlist: verrà tolto da tutte" | `ConfirmDialog` |
| PL6 | **"Aggiungi a playlist…"** dal menu della riga e dal foglio del brano: elenco delle playlist raggruppate per band, con spunte modificabili | Sostituisce l'attuale "Copia in band/scaletta" |
| PL7 | **"Crea versione"** dal foglio del brano: duplica il brano ("Titolo (versione 2)") e, se aperto da una playlist, chiede se sostituire l'originale **in quella playlist** | Unico caso in cui si duplica |
| PL8 | **Avviso di condivisione** in modifica: "Questo brano è in 3 playlist: le modifiche valgono per tutte" con il link "Crea versione" | Solo se le playlist sono 2 o più |
| PL9 | **Nuovo brano o blocco:** creato da una playlist va nel serbatoio e in coda alla playlist; creato da "Tutti i brani" va solo nel serbatoio | Il foglio non chiede più band e scaletta |
| PL10 | **Navigazione e Live per playlist:** Prec/Succ, posizione `n / N`, elenco alfabetico (V11), "Avvia live" e invio del preset (D2) seguono la playlist da cui si è aperto il brano | Nell'URL `playlist=<id>` accanto a `openNote`; senza playlist (dal serbatoio) niente barra Prec/Succ |
| PL12 | **Preset per playlist (P4):** nel foglio aperto da una playlist il campo preset modifica il preset **di quella playlist**, con la scritta "Predefinito del brano: 48 · S2" e il comando "Usa il predefinito"; aperto dal serbatoio modifica il predefinito del brano | Il chip del preset mostra sempre il preset effettivo |
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
  - Va **provata su un account reale con un backup**: menu ⋮ della pagina Note → **Esporta backup (JSON)**, disponibile da subito (PR separata, prima della Fase 6.2), e conversione avviata a mano.
- **Due dispositivi:** se un dispositivo con la versione vecchia scrive una nota dopo la migrazione, quella nota avrà solo `band`/`setlist`.
  - All'avvio, con il marcatore presente, le note senza playlist e non unite compaiono nel serbatoio e restano raggiungibili.
  - Dopo il rilascio basta aggiornare la PWA.
- **Pagina orfana `/notes/editor` (N6):** scrive ancora il modello vecchio. Va rimossa in questa fase, ed è la proposta per D5 su questa pagina.

## 8. Verifica

- **Test unitari:**
  - migrazione: duplicati identici e diversi, ordine, band mancanti, scalette vuote, idempotenza, note nuove dopo la migrazione;
  - operazioni sulle playlist: aggiungi, togli, riordina, sostituisci con una versione, eliminazione di un brano condiviso, preset effettivo;
  - posizione e navigazione per playlist.
- **Playwright**, con serbatoio e playlist iniettati in cache:
  - PL1–PL12;
  - Live e V11 su due playlist che condividono un brano;
  - nessuna regressione negli scenari Note esistenti (`check-live`, `check-f3a`, `check-f3b`, `check-nt2`, `check-nt3`, `check-d1d2`).
- **Manuale (Fase 7)**, con account Google reale: backup, migrazione, riepilogo, due playlist con un brano comune, modifica condivisa, creazione di una versione.

## 9. Prova sul backup reale (2026-10-26)

Simulazione della migrazione sul backup dell'utente (121 note: 107 brani, 14 blocchi), senza scritture sull'account:

| Regola | Serbatoio | Unioni |
|---|---|---|
| Solo identici (P3) | 108 | 13: 6 brani acustici presenti in due scalette, 6 blocchi copiati in "Senza Scaletta", 1 copia in "Senza Band" |
| Identici a parte il preset (P3 + P4, **scelta**) | 104 | 17: le 13 precedenti più *Supersonic*, *335 - Don't look back in anger*, *ACU - Hello*, *Go Let It Out* |

- **Playlist risultanti (5):**
  - BRIT / Prova;
  - EMERALD / Completa;
  - ROCKIN' STARS / Acoustic O'Connell;
  - ROCKIN' STARS / Acu + letture;
  - ROCKIN' STARS / Rockin' 2026.
- **Note solo nel serbatoio ("Senza Scaletta"):** 8, di cui 6 sono doppioni identici di blocchi già presenti in *Acu + letture*.
- **Titoli come "ACU - …" e "335 - …"** sono versioni volute: restano brani distinti.
- **Nomi con spazio finale** ("EMERALD ", "Completa ") coincidono con la band "EMERALD" della pagina Band dopo la normalizzazione (P5).
- **Prova completa in memoria (Fase 6.2):** piano, esecutore con scrittore finto e rilettura dei documenti.
  - Esito: 2 blocchi di scrittura, 0 note modificate nel contenuto, 5 playlist su 5 identiche a prima per brani, ordine e preset effettivo.
  - Due copie unite avevano una scena senza slot: la scena senza slot non manda comandi (`getPresetSendCommands`), quindi viene considerata vuota.
- **Preset "nessuno" per playlist:** quando una copia senza preset viene unita a una copia con preset, la sua playlist conserva "nessun preset" (`presetSlot: ''`), per non mandare un preset che prima non partiva (es. *335 - Don't look back in anger* in *Acu + letture*).

## 10. Unisci note identiche (dopo la conversione)

Dal menu ⋮ della pagina Note, solo nel modello a playlist. Trova le note con **contenuto identico ma titolo diverso** (es. "Hello" e "ACU - Hello"):

- **Contenuto:**
  - conta: sezioni (tipo, testo, accordi), note generali, testo del blocco;
  - non conta: titolo e preset;
  - le note senza contenuto non si uniscono mai, perché brani diversi ancora vuoti non sono doppioni.
- **Nota proposta da tenere,** in quest'ordine di preferenza:
  1. senza "ACU" nel titolo;
  2. senza "335";
  3. il titolo più corto.

  L'utente può scegliere un'altra nota o escludere un gruppo.
- **Nelle playlist** la nota tenuta prende il posto delle altre, nella stessa posizione. Il preset effettivo non cambia: se la copia eliminata aveva un preset diverso, diventa il preset proprio della playlist. Se la nota tenuta era già nella playlist, la copia viene tolta.
- **Ordine delle scritture:**
  1. le playlist;
  2. le copie già unite (`mergedInto`) che puntavano alle note eliminate;
  3. l'eliminazione delle note.

  Se una playlist non si salva, nulla viene eliminato.
- **Prima di eliminare** si chiede conferma; dal dialogo si può esportare il backup.

Prova sul backup reale del 2026-10-26, dopo la conversione simulata:
- 11 gruppi, 14 note da eliminare, 3 playlist modificate;
- in ogni playlist restano lo stesso numero di brani, lo stesso ordine e lo stesso preset effettivo;
- esclusi 2 falsi gruppi: 13 brani diversi senza testo e 8 blocchi vuoti.
