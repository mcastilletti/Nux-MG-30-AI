# MG30 Studio AI — Audit UX/UI e piano di refactoring frontend

Commit di riferimento: `5a59de5` (main dopo la PR #13). Data: 2026-10-25.

Questo documento è il risultato della prima attività del refactoring: **audit e piano, nessuna modifica al frontend**. L'unico altro file creato è la skill di prodotto `mg30-studio-ux` (`.agents/skills/mg30-studio-ux/`).

**Legenda**
- **[V] Verificato**: comportamento letto nel codice, con riferimento `file:riga`.
- **[H] Ipotesi**: deduzione dal codice da confermare con un test o su dispositivo.
- **[P] Proposta**: funzione o cambiamento nuovo, da approvare.

**Priorità**
- **P0**: blocca un flusso essenziale o può causare perdita di dati.
- **P1**: grave problema di usabilità, accessibilità o affidabilità.
- **P2**: miglioramento significativo.
- **P3**: rifinitura.

---

## 0. Stato di avanzamento

**Fase 0 completata** il 2026-10-25 (branch `claude/loving-ride-r0jfma`), seguita dalle correzioni P1 che non richiedono decisioni. Typecheck pulito, 26/26 test verdi (12 nuovi).

| Voce | Esito | Commit | Verifica eseguita |
|---|---|---|---|
| NT1 — blocco spostato fuori dalla scaletta | ✅ Risolto | `2b58d38` | Test unitari sul payload (`block-note-data.test.ts`) |
| K1 — manopole di Gate/Comp/Mod senza MIDI | ✅ Risolto | `e8f6ab5` | Test sullo store MIDI (`use-midi-store.test.ts`). **Da provare con la MG-30 reale** |
| NT3 — nota non in cache sovrascrivibile vuota | ✅ Risolto | `5361261` | Test unitari + Playwright (nota/blocco presenti e assenti) |
| NT2 — modifiche perse con X, Annulla, Indietro | ✅ Risolto (versione minima) | `9b1fc98` | Test unitari + Playwright, 15 controlli e cronologia. Restano da progettare in Fase 3 lo stato di salvataggio visibile e la modifica sicura completa |
| E6, L3, L5 — messaggi di salvataggio ingannevoli | ✅ Testi corretti | `4e77d9b` | Playwright (toast offline di editor e Library) |
| NT5, NT6, NT20, C1 — cache al logout, salvataggio da non loggati, doppio "successivo", Band da non loggati | ✅ Risolto | `0cd1f5a` | Playwright (messaggio Band, toast "Accedi per salvare", un solo pulsante nel blocco). NT5 **da provare con due account reali** |
| NT8, NT13, NT14, NT15, E9 — scroll al cambio brano, ricerca nascosta, riordino in vista filtrata, altezza pannello e dialoghi | ✅ Risolto (NT14 in versione minima) | `637a7b6` | Playwright (scroll a 0 dopo "successiva", filtro azzerato, maniglie solo con scaletta). La modalità "Riordina" esplicita resta per la Fase 3 (F3) |
| E5, L2 — pulsanti hardware attivi offline | ✅ Parziale | `338e6be` | Playwright (disattivati offline). Restano conferma, annullamento e avanzamento: decisione D8 |
| S1 / P0-4, E6, L3 — preset solo in memoria | ✅ Risolto (D1) | `43c0105`, `d7dc107` | Test unitari (`preset-storage.test.ts`) + Playwright: SALVA, ricarica, esportazione, importazione valida e non valida. **Da provare con un account Google reale** (sincronizzazione Firestore) |
| NT4 — preset inviato su Annulla e salvataggio, scena NaN | ✅ Risolto (D2) | `2b97066` | Test unitari (`preset-send.test.ts`) + Playwright con MIDI simulato: apertura, ▶, Annulla, interruttore spento/acceso, scena vuota. **Da provare con la MG-30 reale** |

**Baseline visiva** (Playwright, 10 pagine × 4 viewport, da non loggati e con note iniettate in cache):
- nessuno scroll orizzontale a livello di pagina;
- nessun errore JavaScript;
- dopo le correzioni, confronto identico sulle 40 combinazioni (overflow, errori, numero di target sotto i 44px);
- confermata l'ipotesi E1 e trovata la nuova voce E10 (vedi §5.4).

**Non verificato:** test su dispositivi reali (iOS/Android), con la pedaliera MG-30 collegata, e misure di contrasto. Sono previsti nella Fase 1.

## 0.2 Fase 2 — design system (2026-10-25)

| Voce | Esito | Commit |
|---|---|---|
| Token di stato (`success`, `warning`, `info`) e dei blocchi (`--block-*`) | ✅ Stessi valori di prima | `5dfea77` |
| Scala dei testi piccoli (`text-label`, `text-caption`, `text-body-sm`, `text-micro`) al posto di `text-[Npx]` | ✅ Stessi valori; tailwind-merge configurato | `5dfea77` |
| Moduli condivisi `slot.ts`, `section-colors.ts`, accordi in `chord-data.ts` (M3) | ✅ 10 copie dell'etichetta slot sostituite | `5dfea77` |
| Bordo del blocco selezionato e sfondo della modulazione | ✅ Corretto: `hsla(H S L, a)` era CSS non valido e veniva ignorato | `5dfea77` |
| Contrasti (pulsanti primari, slot, blocchi) | ✅ Nessun testo sotto soglia, esclusi i separatori decorativi | `697555a` |
| `IconButton`, `ConnectionStatus`, `SaveStatus`, `ConfirmDialog`, `EmptyState`/`ErrorState` | ✅ Con test di base | `bf5a724` |
| E8/H2 — errori MIDI invisibili | ✅ L'header mostra "Errore MIDI" con spiegazione | `bf5a724` |
| NT17 — doppio salvataggio | ✅ Guardia sincrona e indicatore. **Da provare con un account reale** | `bf5a724` |
| NT21 — stati della lista note | ✅ Caricamento, errore con Riprova, accesso, nessun risultato | `bf5a724` |
| C2 — eliminazione strumentazione senza conferma | ✅ | `bf5a724` |
| N4 — safe area | ✅ Implementata. **Da provare su iPhone in modalità PWA** | `bf5a724`, `bd2a5e2` |
| Toast su mobile | ✅ Sotto l'header | `bd2a5e2` |
| `DialogContent` con altezza massima | ✅ Già in `637a7b6` | — |

**Verifica:**
- confronto pixel a 4 viewport dopo i token: identico alla baseline, salvo il bordo corretto;
- 15 controlli Playwright sui componenti;
- regressioni NT2, NT3, cronologia, D1/D2 e P1 tutte verdi;
- 43 test unitari, nessuno scroll orizzontale e nessun errore JavaScript sulle 40 combinazioni pagina × viewport.

**Restano per la Fase 5:**
- migrazione pagina per pagina dei colori `zinc-*`/`green-*` ai token;
- testo minimo a 12px;
- nuova barra mobile con "Altro" e header dell'editor su due righe (approvati);
- `IconButton` sugli altri pulsanti icona.

## 0.1 Esito della Fase 1 (2026-10-25)

Verifiche con Playwright sulla build di produzione, da non loggati, con note iniettate in cache. Script nello scratchpad della sessione, non nel repository (D10).

### Ipotesi [H]

| Voce | Esito | Come |
|---|---|---|
| Toast mobile sopra l'header | ✅ **Confermato e peggiore del previsto**: toast fuori schermo sotto i 640px. Corretto in `e17f847` | Posizione misurata a 360/390/768/1280px |
| NT11 — accordi in ordine inverso | ✅ Confermato | Picker: G poi Gm → "Gm, G" |
| NT12 — posizioni accordi solo in tooltip | ✅ Confermato | Tocco su un accordo in lettura: nessun tooltip né popover |
| NT17 — doppio salvataggio | ✅ Confermato dal codice | Il test richiede un account |
| Tastiera aperta nell'editor delle note | ❌ Smentito | Viewport 390×420: il pulsante Salva resta visibile |
| E1 — header dell'editor a 360px | ✅ Già confermato in Fase 0. In più: toccando SAVE il contenitore principale scorre di 55px in orizzontale (contenuto largo 445px) | Misura di `scrollLeft` |
| N4 — safe area iOS | ⏳ Non verificabile in Chromium | Serve un iPhone in modalità PWA |

### Contrasti (soglia WCAG AA 4,5:1, 3:1 per testo grande)

Rapporto calcolato su ogni testo visibile, componendo colore, trasparenze e opacità degli antenati. Pagine: Home, Library, Editor, Note, foglio nota, Band, Settings, Strumentazione.

| Elemento | Rapporto | Dove | Proposta (F2) |
|---|---|---|---|
| Testo bianco sul pulsante primario (`--primary` 261 43% 65%) | **3,34:1** | Tutti i pulsanti primari: SAVE, Nuovo, Aggiungi, scena attiva | `--primary-foreground` scuro (circa 240 10% 6%): circa 6:1 senza toccare il viola, che resta leggibile come accento su fondo scuro |
| Nomi dei blocchi nella catena (`zinc-500`, 10px) | 4,14:1 | Editor | `zinc-400` e almeno 11–12px |
| Etichette slot `muted-foreground/60` | 4,39:1 | Library, 128 card | Opacità almeno 80% |
| Separatori "•" con `opacity-30` | 1,91:1 | Note | Decorativi: `aria-hidden`, nessun obbligo di contrasto |

Home, Band, Settings e il foglio nota non hanno testi sotto soglia.

### Proposta di architettura informativa (da approvare)

**Barra mobile (5 voci, target ≥44px):** Editor · Library · Note · Band · **Altro**.
- "Altro" apre un pannello con Home, Strumentazione (AI), Impostazioni, Avanzate (SysEx Analyzer, se resta dopo D5), account (accedi/esci) e stato MIDI.
- Ogni sezione raggiungibile in al massimo 2 tocchi; scompare il trigger della sidebar da 28px (N1).

**Sidebar desktop**, stesse voci raggruppate:
- *Suono*: Editor, Library, Strumentazione;
- *Palco*: Note, Band;
- *Sistema*: Impostazioni, Avanzate.

**Header essenziale dell'editor** (risolve E1, E10 e lo scroll orizzontale):
- riga 1: ‹ slot › · nome del preset (intero su due righe o con tocco per leggerlo) · pallino di stato MIDI;
- riga 2: Scene 1 · 2 · 3 · **SALVA**;
- le azioni secondarie (AI Mode, leggi nome, invia preset, annulla/ripeti, copia scena) vanno in un menu ⋮.

**Titoli:** una mappa route → titolo, così ogni pagina mostra il suo nome (N2).

### Direzione visiva: "strumento da palco"

- **Scuro e ad alto contrasto:** fondo quasi nero, testo principale ≥7:1, secondario ≥4,5:1; niente testo sotto 12px tranne badge di stato.
- **Un solo accento** (viola) per azioni e selezione. Colori di stato fissi: verde = attivo/collegato, ambra = offline/attenzione, rosso = errore/elimina.
- **Denso ma leggibile:** card compatte, numeri e accordi grandi, target sempre ≥44px.
- **Poche animazioni,** brevi e disattivate da `prefers-reduced-motion` (già gestito).
- **Modalità Live** (D4): testo regolabile, schermo intero, blocco anti-tocco, avanzamento a tocco.

## 1. Sintesi

- **Lo stato tecnico è sano.** Typecheck pulito, 14 test unitari verdi, build di produzione riuscita. Però la build **non** controlla i tipi né il lint (`next.config.ts`), e non esistono test di interfaccia.
- **I problemi più gravi sono di affidabilità, non estetici:**
  - salvare un blocco di testo lo sposta fuori dalla sua scaletta;
  - chiudere una nota in modifica perde le modifiche senza avviso;
  - le manopole di Gate, Compressore e Modulazione non inviano nulla alla pedaliera;
  - i preset modificati esistono solo in memoria.
- **La sezione Note è vicina all'uso dal vivo,** ma non è pensata per esso:
  - c'è il "successivo" ma non il "precedente";
  - il testo non è regolabile e lo zoom è disabilitato;
  - i comandi distruttivi sono minuscoli o visibili solo al passaggio del mouse;
  - il preset della pedaliera cambia anche solo sfogliando i brani.
- **Su smartphone i problemi ricorrenti sono:**
  - header dell'editor con 14 comandi;
  - target sotto i 44px e testi da 9-11px;
  - controlli invisibili su touch;
  - barre fisse senza safe area;
  - foglio Note alto `100vh`.
- **Manutenibilità:**
  - `editor/page.tsx` ha 1132 righe;
  - la formula dell'etichetta slot è copiata 10 volte;
  - esiste un editor note orfano duplicato;
  - due sistemi di alias dei parametri non concordano tra loro.
- **Primo intervento consigliato:** Fase 0, cioè baseline visiva e correzione dei P0-1 e P0-3. Sono piccoli, isolati e a basso rischio.

---

## 2. Architettura attuale [V]

### 2.1 Stack

- **Framework e librerie:** Next.js 15.1.11 (App Router), React 19, Tailwind 3.4, shadcn/ui su Radix, Zustand 5, Firebase 11 (Auth, Firestore, Storage), Genkit 1.x con Gemini 2.5 Flash, PWA con `@ducanh2912/next-pwa`, dnd-kit, lucide-react.
- **Pagine e shell:** tutte le pagine sono `"use client"`, e ognuna monta il proprio `<AppShell>`. `layout.tsx` non contiene la shell, che quindi si rimonta a ogni navigazione: wake lock, `initialize()` MIDI e sincronizzazione vengono rieseguiti.
- **Tema:** solo scuro (`<html className="dark">`, un unico `:root` in `globals.css`). Font Outfit e Source Code Pro caricati da un `<link>` Google Fonts (non `next/font`).
- **Viewport** (`src/app/layout.tsx:5-11`):
  - `maximumScale: 1`, `userScalable: false`;
  - `appleWebApp.statusBarStyle: 'black-translucent'`;
  - `<html lang="en">` con interfaccia in italiano.

### 2.2 Route

| Route | Funzione reale | Raggiungibile da | Peso JS (first load) |
|---|---|---|---|
| `/` | Dashboard: link alle sezioni, stato MIDI, card "Bulk Backup" senza effetto | sidebar, barra mobile | 317 kB |
| `/library` | 128 slot in griglia/lista, ricerca, rinomina, volume di massa (solo in memoria), "Sync Hardware", "Nuovo" senza effetto | sidebar, barra mobile | 333 kB |
| `/editor` | Editor preset: slot, nome, 3 scene, copia scena, AI Mode, sync, undo/redo, salva, catena di 12 blocchi, manopole | sidebar, barra mobile | 340 kB |
| `/notes` | Archivio note: filtri band/scaletta, ricerca, riordino, copia, elimina, import JSON, stampa, foglio di lettura/modifica | sidebar, barra mobile | 369 kB |
| `/notes/editor` | Vecchio editor note completo (`?id=`) | **nessun link** (orfano) | 337 kB |
| `/bands` | CRUD band e scalette (collezioni dedicate), logo su Storage | sidebar, barra mobile | 321 kB |
| `/instrumentation` | CRUD chitarre e amplificatori per l'AI | sidebar, Home | 330 kB |
| `/tools/sysex-analyzer` | Analisi AI di messaggi SysEx (in inglese) | sidebar, Home | 318 kB |
| `/settings` | Avvisi di login, monitor MIDI, troubleshooting Firebase, versione hardcoded | solo piè di pagina della sidebar | 318 kB |

### 2.3 Navigazione e layout (`src/components/layout/app-shell.tsx`)

- **Desktop:** sidebar shadcn fissa di 16rem, comprimibile.
- **Mobile (<768px):**
  - la sidebar diventa un pannello laterale, aperto da un pulsante di **28px** (`sidebar.tsx:275`);
  - una barra fissa in basso (`fixed bottom-3`, `app-shell.tsx:201`) mostra Home, Library, Editor, Note e Band con etichette da 10px;
  - Strumentazione, SysEx e Settings sono raggiungibili solo dal pannello.
- **Titolo dell'header:** cerca la route corrente in `navItems`. Su `/settings` mostra "App" (`app-shell.tsx:187`).
- **Safe area:** nessun uso di `env(safe-area-inset-*)` né di `viewport-fit=cover` in tutto il progetto.

### 2.4 Stato e persistenza

| Dato | Dove vive | Persistenza |
|---|---|---|
| Preset attivo, undo/redo | `use-preset-store.ts` | **Nessuna** (solo memoria) |
| 128 preset (`devicePresets`), stato MIDI, log MIDI | `use-midi-store.ts` | **Nessuna** |
| Nomi dei preset | `use-preset-names.ts` | localStorage `nux-mg30-preset-names` + Firestore `users/{uid}/settings/presetNames` |
| Note e blocchi | `use-notes-cache.ts` + Firestore `notes` | localStorage `mg30-notes-cache` (TTL 10 min) + Firestore con persistenza offline IndexedDB (`src/firebase/index.ts`) |
| Filtri note | `notes/page.tsx` | localStorage `mg30_notes_filter_band` / `_setlist` |
| Band e scalette | `bands/page.tsx` | Firestore `bands`, `setlists` |
| Chitarre e ampli | `use-instrumentation-store.ts` + Firestore | localStorage `mg30-instrumentation` + Firestore `guitars`, `amplifiers` |

### 2.5 Tooling e baseline (eseguita il 2026-10-25 su `5a59de5`)

| Controllo | Esito | Note |
|---|---|---|
| `npm run typecheck` | ✅ 0 errori | È l'unico controllo dei tipi: la build ha `typescript.ignoreBuildErrors: true` |
| `npm run test` | ✅ 14/14 | 4 file `node:test` con sola logica pura: stato del foglio note, navigazione, contesto strumentazione, normalizzatore preset |
| `npm run build` | ✅ con avvisi | Avvisi preesistenti: modulo `@opentelemetry/exporter-jaeger` di Genkit; Firebase senza configurazione durante il prerender |
| `npm run lint` | ⚠️ non utilizzabile | ESLint non è installato né configurato (`eslint.ignoreDuringBuilds: true`) |
| Test UI / e2e / CI | ❌ assenti | Playwright è disponibile nell'ambiente di sviluppo ma non è una dipendenza del progetto |

### 2.6 Documentazione disallineata

- `docs/blueprint.md`, il brief originale di Firebase Studio, descrive cose diverse dall'app reale: Inter, viola #673AB7, libreria in IndexedDB, confronto A/B, import/export SysEx.
- `docs/backend.json` riporta "slot 1-56".
- `README.md` promette uno sfondo PWA giallo `#FFD500`, mentre il manifest usa `#0a0a0b`.
- `layout.tsx:32` dichiara `manifest: '/manifest.json'`, file che non esiste: l'HTML generato usa correttamente `/manifest.webmanifest` da `src/app/manifest.ts`.

Questi documenti non vengono modificati in questa attività: aggiornarli è parte della Fase 7.

---

## 3. Inventario delle skill

Claude Code carica le skill da `.claude/skills/`, che contiene link alle copie in `.agents/skills/`. Provenienza e licenze sono in `.agents/THIRD_PARTY_SKILLS.md`.

| Ordine | Funzione | Skill | Percorso | Attivazione | Note |
|---|---|---|---|---|---|
| 1 | Direzione visiva | `design-taste-frontend` | `.devin/skills/design-taste-frontend` | Solo Devin (Claude Code non la carica) | Regole anti-"slop". Alcune (padding `py-20/28`, animazioni a molla ovunque, reveal sfalsati) confliggono con l'uso live: prevale `mg30-studio-ux` |
| 1 | Audit visivo | `web-design-guidelines` | `.agents/skills/web-design-guidelines` | Automatica o `/web-design-guidelines` | Scarica le regole aggiornate da GitHub a ogni uso |
| 2 | Requisiti di prodotto | **`mg30-studio-ux`** (nuova) | `.agents/skills/mg30-studio-ux` | Automatica su modifiche UI, o `/mg30-studio-ux` | Integra le altre senza duplicarle |
| 3 | Architettura UI | `frontend-ui-engineering`, `vercel-composition-patterns` | `.agents/skills/` | Automatica | Componenti, stato, WCAG, responsive |
| 4 | Qualità e prestazioni | `vercel-react-best-practices`, `performance-optimization` | `.agents/skills/` | Automatica | Re-render, bundle, rendering |
| 5 | Verifica | `test-driven-development`, `code-review-and-quality`, skill di sistema `run`; subagent `test-engineer`, `code-reviewer`, `web-performance-auditor` | `.agents/skills/`, `.claude/agents/` | Automatica o su richiesta | `browser-testing-with-devtools` richiede il server MCP chrome-devtools, non configurato: per i test visivi si usa Playwright |
| Supporto | Spec, piano, implementazione, decisioni | `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `code-simplification`, `documentation-and-adrs`, `debugging-and-error-recovery` | `.agents/skills/` | Automatica | `spec-driven-development` per la modalità Live delle Note |

---

## 4. Flussi principali (come funzionano oggi) [V]

1. **Selezione e modifica di un preset**
   - Editor → frecce o select dello slot.
   - Se la pedaliera è collegata, viene inviato un Program Change, poi una richiesta SysEx dopo 200ms, che blocca l'editor per circa 2s.
   - Il preset caricato viene da `devicePresets` in memoria.
   - Le modifiche aggiornano lo stato e inviano CC in tempo reale, senza debounce.
2. **Catena effetti**
   - 12 blocchi in uno scroll orizzontale.
   - Il tocco sul blocco lo seleziona e invia il CC per entrare nell'editor hardware del blocco.
   - Il chip ON/OFF annidato accende o spegne il blocco.
3. **Parametri:** manopole rotative con trascinamento verticale (200px per l'intera escursione), tastiera e campo numerico.
4. **Scene e copia scena:** 3 scene per preset; la copia tra scene o preset è stata corretta nella PR #11.
5. **Salvataggio preset**
   - "SALVA" aggiorna solo la copia in memoria.
   - Se la pedaliera è collegata, re-invia via CC la scena attiva: non esiste un comando documentato di scrittura nello slot.
   - Al ricaricamento della pagina tutto si perde.
6. **AI Mode:** genera una proposta validata dal normalizzatore, oppure applica un JSON incollato direttamente.
7. **Note**
   - Lista filtrata per band/scaletta → foglio a schermo intero in lettura.
   - Matita per modificare, Salva esplicito su Firestore.
   - ▶ apre il brano successivo della scaletta.
   - All'apertura viene inviato il preset collegato.
8. **Import/export:** esiste solo l'incolla di JSON (AI Mode e note), la stampa PDF delle note e la copia negli appunti dell'analisi SysEx. **Non esiste export o import di preset su file** (la card "Bulk Backup" non fa nulla).

---

## 5. Audit per area

Colonne: **ID** · **Problema** · **Evidenza** · **Impatto** · **P** · **Soluzione** · **Dip.** (dipendenze) · **Rischio** (di regressione) · **Verifica**.

### 5.1 Navigazione globale e struttura informativa

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| N1 [V] | Strumentazione, SysEx e Settings sono raggiungibili su mobile solo da un pulsante di 28px | `app-shell.tsx:201-210`, `sidebar.tsx:275` | Configurazione dell'AI difficile da trovare su telefono | P2 | Barra mobile: Editor, Library, Note, Band, "Altro" (pannello con le sezioni restanti); trigger ≥44px | F1 (IA) | Basso | Playwright 360px: tutte le sezioni in ≤2 tocchi |
| N2 [V] | Su Settings l'header mostra "App" | `app-shell.tsx:187` | Orientamento confuso | P3 | Titolo da una mappa delle route completa | — | Basso | Titolo corretto su ogni route |
| N3 [V] | La shell si rimonta a ogni pagina | ogni `page.tsx` contiene `<AppShell>` | Wake lock, `initialize()` e sync MIDI rieseguiti a ogni navigazione; sidebar che "lampeggia" | P2 | Spostare `AppShell` in un layout condiviso (route group) | F4 | Medio (effetti MIDI) | Una sola inizializzazione MIDI per sessione (log) |
| N4 [V] | Nessuna safe area con `black-translucent` e barra fissa in basso | `layout.tsx:18`, `app-shell.tsx:201`; nessun `env(safe-area-inset-*)` | [H] (resta da provare su iPhone: non riproducibile in Chromium) Header sotto la barra di stato e barra nav sotto l'indicatore home nella PWA iOS | P1 | `viewport-fit=cover` + padding con `env(safe-area-inset-*)` | F2 | Basso | Dispositivo iOS in modalità standalone |
| N5 [V] | Lingua mista: "Navigation", "Hardware Status", "Settings", pagina SysEx in inglese | `app-shell.tsx:110,153,172`; `tools/sysex-analyzer` | Incoerenza | P3 | Testi in italiano, termini tecnici del dispositivo invariati | F5 | Basso | Revisione dei testi |
| N6 [V] | `/notes/editor` è orfana e duplica `NoteEditorContent` | nessun link (grep); `notes/editor/page.tsx:27-68,707` | Manutenzione doppia, divergenze | P2 | Decisione D5, poi rimozione dopo verifica | D5 | Basso | Nessun riferimento residuo; test verdi |

### 5.2 Home

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| H1 [V] | La card "Bulk Backup" sembra cliccabile ma non fa nulla e promette un file sysex | `page.tsx:101-113` | Falsa promessa di backup | P1 | Rimuoverla o collegarla all'export quando esisterà (D1) | D1 | Basso | Nessun elemento cliccabile senza azione |
| H2 [V] | Lo stato MIDI mostra la stringa grezza in inglese e non spiega l'errore | `page.tsx:154`; `lastError` mai mostrato | Utente bloccato senza sapere perché (es. browser senza Web MIDI) | P1 | Componente `ConnectionStatus` con stati in italiano e motivo | F2 | Basso | Simulare l'assenza di Web MIDI |

### 5.3 Gestione preset (Library)

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| L1 [V] | "Nuovo" non ha `onClick` | `library/page.tsx:235-237` | Pulsante morto | P1 | Rimuoverlo o definirne la funzione | — | Basso | Nessun pulsante senza azione |
| L2 [V] ◐ `338e6be` | "Sync Hardware": 128 PC × 500ms ≈ 64s, senza conferma né annullamento, senza controllo della connessione, nessun effetto visibile, lascia la pedaliera sullo slot 128 | `library/page.tsx:226-234`; `use-midi-store.ts:544-565` | Attesa inutile e preset cambiato a sorpresa | P1 | Disabilitarlo offline, conferma, annullamento, ripristino dello slot iniziale; rivalutarne l'utilità | D8 | Medio (MIDI) | Test con e senza pedaliera |
| L3 [V] ✅ `4e77d9b` (testo) | Il volume di massa modifica solo la memoria (non invia, non persiste) e il toast dice "aggiornato" | `library/page.tsx:84-152` | Modifica che si perde | P0 (legato a P0-4) | Testo veritiero subito; soluzione con D1 | D1 | Basso | Toast coerente con l'effetto reale |
| L4 [V] | Card e righe cliccabili sono `div`/`tr` senza ruolo né tastiera; checkbox finte | `library/page.tsx:357-377,477-496` | Inaccessibile da tastiera e lettore di schermo | P1 | `button`/link reali, `ui/checkbox` | F2 | Basso | Navigazione completa da tastiera |
| L5 [V] ✅ `4e77d9b` | Il toast "selezionato sull'hardware" compare anche offline | `library/page.tsx:160-167` | Feedback falso | P2 | Messaggio condizionato alla connessione | — | Basso | Verifica offline |
| L6 [V] | 128 card alte in colonna singola su mobile, senza virtualizzazione | `library/page.tsx:351` | Scorrimento lungo | P2 | Vista compatta a righe su mobile; ricerca per slot in evidenza | F5 | Basso | Playwright 360px |

### 5.4 Editor della catena effetti

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| E1 [V] | Header con 14 comandi; il gruppo azioni non va a capo: **confermato dalla baseline**, a 360px il pulsante SALVA è tagliato sul bordo destro | `editor/page.tsx:867` (manca `flex-wrap`) | Comandi fuori schermo o scroll orizzontale | P1 | Header mobile essenziale (slot, scene, salva) + menu "Altro" con etichette | F1 | Medio | Playwright 360×740: nessun overflow |
| E2 [V] ✅ `59242a3` | Chip ON/OFF di circa 24×16px annidato dentro il `button` del blocco | `editor/page.tsx:988-1041` | HTML non valido, tocchi sbagliati (seleziona invece di spegnere), lettori di schermo confusi | P1 | Due controlli fratelli: blocco (seleziona) e switch ON/OFF ≥44px con `aria-pressed` | F2 | Medio | Test da tastiera e touch |
| E3 [V] ✅ `59242a3` | Selezione del blocco indicata solo con colore e bordo; nessun `aria-pressed`/`aria-current` | `editor/page.tsx:995-1004` | Stato non percepibile | P2 | Indicatore testuale + attributo ARIA | F2 | Basso | Ispezione accessibilità |
| E4 [V] | Catena di circa 1640px senza snap né suggerimento di scroll; nessuno scroll automatico al blocco selezionato | `editor/page.tsx:980` | Su mobile si vedono circa 3 blocchi su 12 | P2 | Scroll-snap, sfumatura ai bordi, scroll al blocco selezionato; valutare una vista a griglia compatta | F5 | Basso | Playwright |
| E5 [V] ◐ `338e6be` | Due pulsanti "sync" quasi uguali: Download (chiede solo il nome) e RefreshCw (invia tutto, overlay di 18,5s anche offline) | `editor/page.tsx:593-610,966`; `use-midi-store.ts:516-541` | Confusione; editor bloccato senza motivo | P1 | Etichette chiare ("Leggi nome dalla pedaliera", "Invia preset alla pedaliera"), disabilitati offline, avanzamento visibile | D8 | Medio | Test offline e collegato |
| E10 [V] | Nome del preset e titolo della nota troncati su una riga ("Activ…", "Wonderwall (I…"), anche a 1280px | baseline Playwright; `editor/page.tsx` (SelectTrigger), `NoteEditorContent.tsx` (`truncate` sul titolo) | Brano o preset non riconoscibili a colpo d'occhio | P2 | Titolo su 2 righe (`line-clamp-2`), nome completo nel selettore | F5 | Basso | Screenshot a 360px e 1280px |
| E6 [V] ✅ `4e77d9b` (testi) | "SALVA": toast "Salvataggio in corso" anche quando `syncFullPreset` esce subito; offline "Local Save" non persistente | `editor/page.tsx:575-591`; `use-midi-store.ts:518` | Falsa sicurezza (vedi P0-4) | P0/P1 | Testo veritiero subito; persistenza con D1 | D1 | Basso | Toast coerenti |
| E7 [V] | Pulsante "Chiudi" della catena invia solo un CC all'hardware, anche offline | `editor/page.tsx:977`; `use-midi-store.ts:493` | Etichetta ingannevole | P2 | Rinominarlo o rimuoverlo dalla UI principale | — | Basso | — |
| E8 [V] | `lastError` MIDI e stati `connecting`/`error` mai mostrati | grep `lastError` | Errori di connessione invisibili | P1 | `ConnectionStatus` (vedi H2) | F2 | Basso | Simulazione errore |
| E9 [V] ✅ `637a7b6` | Dialoghi AI Mode e Copia scena senza altezza massima né scroll | `ui/dialog.tsx:41` | [H] Su mobile con tastiera aperta il contenuto non è raggiungibile | P1 | `max-h-[85dvh] overflow-y-auto` nel `DialogContent` | F2 | Basso | Dispositivo con tastiera |

### 5.5 Controlli dei parametri (`src/components/controls/rotary-knob.tsx`)

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| K1 [V] ✅ `e8f6ab5` | **Manopole di Gate, Compressore e Modulazione non inviano MIDI** (passato l'id del blocco invece del tipo) | `editor/page.tsx:455-458`, `use-midi-store.ts:432-433`; id `ng`/`cmp`/`mod` | Regolazione impossibile su 3 blocchi su 12 | **P0** | Passare `effect.type` (il parametro `effectType` esiste già ed è inutilizzato) | — | Basso | Test unitario della mappatura + prova con pedaliera |
| K2 [V] | `touch-none` + `preventDefault`: un gesto iniziato sulla manopola non fa scorrere la pagina | `rotary-knob.tsx:67,125` | Scroll "bloccato" su mobile con griglia a 2 colonne | P1 | Attivare il trascinamento solo dopo una soglia verticale o con pressione prolungata; area di scroll tra le manopole | F5 | Medio | Test su dispositivo |
| K3 [V] ✅ `d56b250` | Precisione touch: 200px per l'intera escursione; Hi Cut (5000-20000 Hz) ≈ 75 Hz per pixel; regolazione fine solo con Shift | `rotary-knob.tsx:57-64` | Regolazioni fini impossibili su touch | P2 | Pulsanti −/+ di un passo, campo numerico in evidenza, modalità fine | F5 | Basso | Test su dispositivo |
| K4 [V] ✅ `d56b250` | Il campo numerico invia a ogni carattere (1, 10, 100) | `rotary-knob.tsx:195-201` | Valori intermedi inviati alla pedaliera | P2 | Invio su conferma o con debounce | F6 | Basso | Test unitario |
| K5 [V] | Le unità (Hz, dB) non vengono mai passate alla manopola | `editor/page.tsx:1121` | Valori ambigui | P2 | Passare `unit` dal catalogo | — | Basso | Ispezione visiva |
| K6 [V] | Il doppio clic riporta a metà range invece che al default; su touch non esiste | `rotary-knob.tsx:138-141` | Reset errato | P2 | Reset al `default` del catalogo, con comando visibile | — | Basso | Test unitario |
| K7 [V] ✅ `d56b250` | Le modifiche da tastiera o da campo numerico non entrano nella cronologia undo | `rotary-knob.tsx:95,140` | Undo incoerente | P2 | Salvare la cronologia anche su commit da tastiera o input | F6 | Medio | Test sullo store |

### 5.6 Note

Le voci Note sono **[V]** salvo dove indicato. Requisiti di dettaglio e scenari sono nella skill (`references/live-notes.md`) e nella sezione 8.

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| NT1 ✅ `2b58d38` | **Salvare un blocco esistente lo sposta** in "Senza Band / Senza Scaletta" con `order: 0` | `BlockEditorContent.tsx:63-84`; `notes/page.tsx:718-722` | Corruzione dati: il blocco sparisce dalla scaletta | **P0** | Per i blocchi esistenti conservare `band`/`setlist`/`order` della nota caricata | — | Basso | Test unitario sul payload; modifica di un blocco in una scaletta |
| NT2 ✅ `9b1fc98` (minima) | **Modifiche perse senza avviso**: X, "Annulla" e Indietro di sistema | `NoteEditorContent.tsx:390,448-458`; `BlockEditorContent.tsx:109`; `notes/page.tsx:115` (`replaceState`) | Perdita di appunti durante le prove | **P0** | Rilevamento delle modifiche non salvate e conferma all'uscita; Indietro che chiude il foglio | F3 | Medio | Scenario 5 |
| NT3 ✅ `5361261` | **Nota aperta con cache vuota** (URL `?openNote=`, altro dispositivo): editor vuoto, la matita resta attiva, il salvataggio sovrascrive | `NoteEditorContent.tsx:206-215,424,299-302` | [H sulla frequenza] Perdita del contenuto di una nota | **P0** | Ricaricare la nota quando arriva la cache; stato "nota non trovata"; salvataggio bloccato se non caricata | — | Basso | Test con cache vuota e URL diretto |
| NT4 ✅ `2b97066` | Il preset viene inviato aprendo un brano, con ▶, su "Annulla" e al primo salvataggio; scena vuota → `parseInt('')` = NaN | `NoteEditorContent.tsx:206-215,264-270,453` | Cambio di suono imprevisto dal vivo | P1 | Decisione D2; invio visibile tramite chip; nessun invio su Annulla e salvataggio | D2 | Medio (comportamento) | Log MIDI durante la navigazione |
| NT5 ✅ `0cd1f5a` | Dopo il logout restano visibili le note del precedente utente | `clearCache` mai chiamato; `app-shell.tsx:70-76` | Privacy, dati mescolati | P1 | Svuotare la cache al logout e al cambio utente | — | Basso | Login, logout, login con un altro account |
| NT6 ✅ `0cd1f5a` | Salvataggio da non loggati con `userId: undefined` | `NoteEditorContent.tsx:296`; `BlockEditorContent.tsx:79` | [H] Errore generico senza invito ad accedere | P1 | Bloccare il salvataggio con messaggio "Accedi per salvare" | — | Basso | Test da non loggati |
| NT7 | Nessun "precedente", nessuna posizione "3/12"; ▶ in alto a destra | `note-navigation.ts`; `NoteEditorContent.tsx:435-445` | Navigazione dal vivo lenta e scomoda a una mano | P1 | Barra inferiore Prec/posizione/Succ ≥48px | F3 | Basso | Scenario 3 |
| NT8 ✅ `637a7b6` | Al cambio brano lo scroll e i pannelli restano com'erano | nessuna `key` per nota (`notes/page.tsx:737`; `NoteSheet.tsx:58`) | [H] Il nuovo brano si apre a metà | P1 | `key` per nota o reset dello scroll | — | Basso | Scenario 3 |
| NT9 | Rimozione accordo con un tap su una X di 14px, senza annullamento | `NoteEditorContent.tsx:698-706` | Cancellazioni accidentali | P1 | Target ≥44px, modalità modifica accordi esplicita, annullamento | F3 | Basso | Test touch |
| NT10 | Controlli visibili solo al passaggio del mouse: inserisci accordo, inserisci sezione, rimuovi a capo, cestino al 30% | `NoteEditorContent.tsx:604,666,733,790`; `notes/page.tsx:799-811` | Invisibili ma toccabili su touch | P1 | Controlli sempre visibili in modalità modifica; azioni della card in un menu ⋮ | F3 | Basso | Ispezione su touch |
| NT11 [V] | Il picker inserisce più accordi in ordine inverso | `NoteEditorContent.tsx:654,738` | **Confermato** (Fase 1): scegliendo G e poi Gm si ottiene "Gm, G" | P2 | Indice di inserimento che avanza o chiusura dopo la scelta | — | Basso | Test unitario |
| NT12 [V] | Posizioni degli accordi solo in tooltip | `NoteEditorContent.tsx:679-729` | **Confermato** (Fase 1): al tocco non compare né tooltip né popover | P2 | Popover al tocco | F3 | Basso | Test su touch |
| NT13 ✅ `637a7b6` | La ricerca nascosta continua a filtrare la lista | `notes/page.tsx:173,416` | Lista "vuota" inspiegabile | P1 | Chiudere la ricerca azzera il filtro, oppure filtro attivo visibile | — | Basso | Test |
| NT14 ◐ `637a7b6` | Il trascinamento in vista filtrata o con ricerca rinumera `order` di un sottoinsieme | `notes/page.tsx:258-279` | Ordine delle scalette alterato | P1 | Riordino solo in modalità "Riordina" con una scaletta selezionata | F3 | Medio | Test sull'ordine |
| NT15 ✅ `637a7b6` | Foglio alto `h-[100vh]` | `NoteSheet.tsx:57` | [H] Fondo coperto dalla barra del browser | P1 | `h-[100dvh]` | — | Basso | Dispositivo |
| NT16 | Testo non regolabile, zoom disabilitato, nessuna modalità di lettura live | `layout.tsx:9-10`; grep | Leggibilità sul palco | P1 | Modalità Live [P] e decisione D3 | D3, D4 | Medio | Scenari 2 e 7 |
| NT17 [V] | Nessuno stato di salvataggio e nessuna protezione dal doppio invio | `handleSaveNote` senza stato di invio; pulsante mai disabilitato | **Confermato dal codice** (il test richiede login): due tocchi su una nota nuova creano due documenti | P1 | Componente `SaveStatus`, pulsante disabilitato durante il salvataggio | F2 | Basso | Scenario 4 |
| NT18 | La stampa taglia i brani lunghi (pagina A4 fissa, `overflow: hidden`) e stampa lo slot grezzo | `globals.css:118-133`; `notes/page.tsx:673` | Scalette stampate incomplete | P2 | Più pagine per brano lungo; etichetta `01A` | F5 | Basso | Stampa di un brano lungo |
| NT19 | Doppio modello band/scalette: le band create in Band non compaiono nell'editor note, e nel foglio non si può creare una nuova band o scaletta | `bands/page.tsx:74-98`; `NoteEditorContent.tsx:217-234,546-563` | Flusso di organizzazione spezzato | P2 | Decisione D7 | D7 | Alto (dati) | — |
| NT20 ✅ `0cd1f5a` | Il blocco ha due pulsanti "successivo" | `BlockEditorContent.tsx:133-152` | Incoerenza (corretta solo per i brani) | P3 | Tenere solo il primario | — | Basso | Ispezione |
| NT21 | La lista mostra "Nessun brano" anche durante il caricamento e da non loggati | `notes/page.tsx:542-545` | Stato ambiguo | P2 | Stati distinti: caricamento, accedi, vuoto, errore con riprova | F2 | Basso | Test |

### 5.7 Import, export e salvataggio

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| S1 [V] ✅ `43c0105` | **Preset solo in memoria**: modifiche, volume di massa e "Local Save" persi al ricaricamento; nessun backup su file | `use-preset-store.ts`, `use-midi-store.ts` senza `persist`; grep `Blob`/`download` | Perdita del lavoro di programmazione | **P0** | Decisione D1; nel frattempo testi veritieri | D1 | Alto (dati) | — |
| S2 [V] | Import JSON delle note: guida incompleta (`presetSlot`/`presetScene` accettati ma non documentati); incollare JSON su mobile è scomodo | `notes/page.tsx:631-663,373-374` | Errori di import | P3 | Testo d'aiuto completo; valutare un selettore di file | — | Basso | Import di prova |
| S3 [V] | Ordine dell'import calcolato su tutte le note invece che sulla scaletta | `notes/page.tsx:365-366` | Brano importato in fondo con ordine incoerente | P2 | Calcolo per band+scaletta come negli altri flussi | — | Basso | Test unitario |

### 5.8 Impostazioni e configurazione

| ID | Problema | Evidenza | Impatto | P | Soluzione | Dip. | Rischio | Verifica |
|---|---|---|---|---|---|---|---|---|
| C1 [V] ✅ `0cd1f5a` | Band: spinner infinito da non loggati | `bands/page.tsx:46,68,430` | Pagina inutilizzabile senza spiegazione | P1 | Stato "Accedi per gestire le band" | — | Basso | Test da non loggati |
| C2 [V] | Strumentazione: eliminazione senza conferma; icone senza nome; stella di circa 20px | `instrumentation/page.tsx:114-121,128,132` | Cancellazioni accidentali | P1 | Conferma, nomi accessibili, target 44px | F2 | Basso | Test |
| C3 [V] | Settings: troubleshooting Firebase per sviluppatori, badge "ATTIVO" e versione hardcoded | `settings/page.tsx:100,138-165,177` | Rumore per l'utente finale | P3 | Sezione "Avanzate" comprimibile; versione da `package.json` | D5 | Basso | — |
| C4 [V] | SysEx Analyzer in inglese; "History" senza effetto; strumento da sviluppatore nella navigazione principale | `tools/sysex-analyzer/page.tsx:133` | Confusione | P2 | Decisione D5 | D5 | Basso | — |

### 5.9 Stati di caricamento, errore, conferma e vuoto

- [V] Non esistono `loading.tsx`, `error.tsx`, `global-error.tsx` e `not-found.tsx`. `FirebaseErrorListener` lancia verso un `global-error.tsx` che non c'è.
- [V] `TOAST_LIMIT = 1`: ogni toast sostituisce il precedente, errori compresi (`use-toast.ts:11`).
- [V] Strumentazione imposta `loading` ma non lo mostra mai.
- Proposta (F2): componenti condivisi `EmptyState`, `ErrorState` (con riprova), `SaveStatus`, `ConfirmDialog`; error boundary di route.

### 5.10 Responsive

- [V] `min-width: 320px` sul body. AppShell usa `100dvh`, ma il foglio Note usa `100vh`.
- [V] **Testi piccoli diffusi:** 44 `text-[11px]`, 42 `text-[10px]`, 1 `text-[9px]`.
- [V] **Target sotto i 44px:**
  - trigger sidebar 28px;
  - matita del nome 32px;
  - scene e "Copia" 40px;
  - pulsanti `h-8`/`h-9` in Library, Band e Note.
- [V] `.touch-target` è usato solo in Editor, Library e SysEx.
- [V] **Toast su mobile** (Fase 1): erano **fuori schermo** sotto i 640px, non solo sopra l'header. Il contenitore `fixed` non aveva posizione orizzontale e finiva a x = larghezza dello schermo, quindi nessun messaggio era visibile su telefono, errori compresi. Corretto in `e17f847`. Ora compare in alto e copre l'header per la sua durata: posizionamento definitivo in F2 (sopra la barra di navigazione o con safe area).
- Verifiche visive ai 4 viewport eseguite in Fase 0 (baseline) e Fase 1.

### 5.11 Accessibilità

- [V] Zoom disabilitato (`layout.tsx:9-10`, WCAG 1.4.4): decisione D3.
- [V] ✅ `lang="en"` su un'interfaccia italiana: ora `lang="it"` (Fase 6).
- [V] Controlli interattivi annidati: ON/OFF nella catena (✅ Fase 6, E2); pulsante dentro un badge dentro un `TooltipTrigger` (`NoteEditorContent.tsx:681-708`).
- [V] **Pulsanti icona senza nome:**
  - Copia scena su mobile, Download, Sync, Undo e Redo (solo `title`);
  - Stampa e Cerca nelle Note;
  - elimina della card nota;
  - icone di Band e Strumentazione;
  - X degli accordi;
  - chiusura dei toast.
- [V] **Etichette e focus:**
  - `<label>` non associati agli input in Note, Band, SysEx ed Editor;
  - `focus-visible:ring-0` toglie l'indicatore di focus su diversi input.
- [V] **Titoli:**
  - l'unico `<h1>` è nella sidebar (nascosta su mobile);
  - la Home salta a `<h4>`;
  - l'Editor non ha titoli;
  - c'è un `<main>` annidato in Strumentazione e in `/notes/editor`.
- [V] **Fatto bene:**
  - `prefers-reduced-motion` gestito globalmente;
  - `role="slider"` con valori ARIA sulle manopole;
  - overlay di sync con `role="status" aria-live`;
  - titolo e descrizione `sr-only` nel `NoteSheet`.
- [V] **Contrasti misurati** (Fase 1, vedi §0.1): pulsante primario 3,34:1; nomi dei blocchi nella catena `zinc-500` 10px 4,14:1; etichette slot in Library `muted-foreground/60` 4,39:1. Tutti sotto la soglia AA di 4,5:1.

### 5.12 Prestazioni e manutenibilità

| ID | Problema | Evidenza | P | Soluzione |
|---|---|---|---|---|
| M1 [V] | `editor/page.tsx` di 1132 righe; `applyJsonToPreset` di circa 335 righe nella pagina; logica di prefisso copiata due volte | `editor/page.tsx:42-377,233-285,312-364` | P2 | Estrazione in `src/lib` e componenti (F4) |
| M2 [V] | Due sistemi di alias in disaccordo (`PARAM_SYNONYMS` contro `PARAMETER_ALIASES`) | `editor/page.tsx:49-62`; `mg30-preset-normalizer.ts:38-47` | P2 | Un solo modulo di mappatura (F4) |
| M3 [V] | Etichetta slot copiata 10 volte; `SECTION_COLORS` 2 volte più la stampa; `CHORD_TABLE` 2 volte; `createDefaultEffects` 2 volte con ordine diverso | §Appendice A | P2 | `src/lib/slot.ts`, `section-colors.ts`, `chords.ts`; un solo default (F2/F4) |
| M4 [V] ✅ `d0d135d`, `c12b9cb`, `82ff0a9` | Sottoscrizione all'intero store (`usePresetStore()`, `useMidiStore()`) nell'editor, nella shell e in ogni manopola; ogni messaggio MIDI aggiorna il log e ri-renderizza editor e shell | `editor/page.tsx:404-421`; `use-midi-store.ts:197-198` | P2 | Selettori con `useShallow`, log MIDI in uno store separato, `memo` su blocchi e manopole (F6) |
| M5 [V] ✅ `a9ccd8b` | Per ogni frame di trascinamento: clonazione delle scene, `commitPreset` su 128 preset, log, circa 3 re-render | `use-preset-store.ts:72-83`; `editor/page.tsx:451-453` | P2 | Come M4; commit a fine gesto (F6) |
| M6 [V] ✅ `d0d135d`, `82ff0a9` | 128 `SelectItem` ricostruiti due volte a ogni render; `console.log` per ogni CC in ingresso | `editor/page.tsx:748-753,836-841`; `use-midi-store.ts:261,308` | P3 | Memoizzazione; log solo in sviluppo |
| M7 [V] | Colori hardcoded (`zinc-*`, `emerald-*`, `white/5`, HSL inline) in 9 file; nessun token successo/avviso | §5.10 | P2 | Token semantici (F2) |
| M8 [V] | `button.tsx` applica `[&_svg]:size-4`, che annulla le classi di dimensione delle icone | `ui/button.tsx:8` | P3 | Variante per icone grandi (F2) |
| M9 [V] ✅ `b58cf1e` | Font da `<link>` Google invece di `next/font` | `layout.tsx:43-45` | P3 | `next/font` (F6), da valutare con l'offline della PWA |

---

## 6. Mappa delle priorità

**P0**
- NT1 — salvataggio di un blocco esistente che lo sposta fuori dalla scaletta;
- NT2 — modifiche perse senza avviso;
- NT3 — sovrascrittura di una nota non caricata;
- K1 — manopole di Gate, Compressore e Modulazione mute;
- S1 / L3 / E6 — preset solo in memoria e testi di salvataggio ingannevoli (soluzione completa con D1).

**P1**
- N4 — safe area iOS;
- H1, H2 — Home: card senza effetto, stato MIDI incomprensibile;
- L1, L2, L4 — Library: "Nuovo", "Sync Hardware", accessibilità di card e checkbox;
- E1, E2, E5, E8, E9 — Editor: header mobile, chip ON/OFF, pulsanti sync, errori MIDI invisibili, dialoghi senza scroll;
- K2 — manopole che bloccano lo scroll;
- NT4–NT10, NT13–NT17 — Note;
- C1, C2 — Band e Strumentazione;
- accessibilità: zoom (D3), `lang`, pulsanti icona senza nome.

**P2**
- N1, N3, N6;
- L5, L6;
- E3, E4, E7;
- K3–K7;
- NT11, NT12, NT18, NT19, NT21;
- S3;
- C4;
- M1–M5, M7;
- testi piccoli.

**P3**
- N2, N5;
- NT20;
- S2;
- C3;
- M6, M8, M9;
- documentazione disallineata (§2.6).

Le priorità valutano l'impatto su dati, flussi e accessibilità, non preferenze estetiche.

---

## 7. Piano per fasi

Complessità relativa: **S** piccola · **M** media · **L** grande. Non si danno tempi assoluti prima di aver misurato la Fase 0.

```
F0 Baseline ──┬─► F0b Correzioni P0 ──────────────┐
              └─► F1 Audit e direzione ─► F2 Design system ─┬─► F4 Architettura ─► F5 Pagine ─► F7 Verifica
                                          F3 Spec Note ◄─(D2,D4)┘                    ▲
                                                                   F6 Prestazioni/a11y ┘ (in parallelo a F5)
```

### Fase 0 — Baseline e messa in sicurezza (S/M) — ✅ completata (vedi §0)
- **Deliverable:**
  - baseline typecheck/test/build (già eseguita, §2.5);
  - script Playwright di screenshot per tutte le route ai 4 viewport (360×740, 390×844, 768×1024, 1280×800), da non loggati e con note iniettate in `mg30-notes-cache`;
  - criteri di regressione.
  - **F0b — correzioni P0 isolate**, un commit e una PR ciascuna:
    - NT1: conserva band, scaletta e ordine del blocco;
    - K1: passa `effect.type`;
    - NT3: ricarica la nota all'arrivo della cache, stato "non trovata", nessun salvataggio se non caricata;
    - NT2 versione minima: conferma su X, Indietro e Annulla con modifiche;
    - testi veritieri per "Local Save", volume di massa e "SALVA" in attesa di D1.
- **File:** `BlockEditorContent.tsx`, `NoteEditorContent.tsx`, `notes/page.tsx`, `editor/page.tsx`, `library/page.tsx`; nuovi test `*.test.ts` sulla logica estratta.
- **Skill:** `debugging-and-error-recovery`, `test-driven-development`, `mg30-studio-ux`.
- **Rischi:** basso. Le correzioni sono locali; NT2 tocca il flusso di chiusura.
- **Accettazione:**
  - ogni P0 ha un test che fallisce prima e passa dopo;
  - typecheck e test verdi;
  - screenshot di baseline archiviati.

### Fase 1 — Audit e direzione UX/UI (S) — ✅ verifiche completate, IA da approvare (vedi §0.1)
- **Deliverable:**
  - conferma o smentita delle ipotesi [H] con Playwright: header a 360px, foglio `100vh`, toast, tastiera;
  - misure di contrasto;
  - proposta di architettura informativa (barra mobile Editor/Library/Note/Band/Altro, header essenziale dell'editor);
  - direzione visiva ("strumento da palco": scuro, denso ma leggibile, poche animazioni).
- **File:** solo documenti.
- **Skill:** `web-design-guidelines`, `design-taste-frontend` (subordinata), `mg30-studio-ux`.
- **Rischi:** nessuno sul codice.
- **Accettazione:** ogni [H] della sezione 5 marcata come confermata o smentita; IA approvata.

### Fase 2 — Skill MG30 Studio UX e design system (M) — ✅ completata (vedi §0.2)
- **Deliverable:**
  - skill `mg30-studio-ux` (✅ creata in questa attività);
  - token semantici: successo, avviso, info; colori dei blocchi spostati da `getBlockColorVar` a variabili CSS;
  - scala tipografica che sostituisce i `text-[Npx]`, con la scala "live";
  - componenti `IconButton` (nome obbligatorio, ≥44px), `ConnectionStatus`, `ConfirmDialog`, `SaveStatus`, `EmptyState`/`ErrorState`;
  - `DialogContent` con altezza massima e scroll;
  - moduli condivisi `src/lib/slot.ts`, `section-colors.ts`, `chords.ts`;
  - safe area.
- **File:** `globals.css`, `tailwind.config.ts`, `src/components/ui/*`, nuovi `src/components/common/*`, `src/lib/*`.
- **Skill:** `frontend-ui-engineering`, `mg30-studio-ux`.
- **Rischi:** medio. I token toccano tutta l'app: introdurli senza cambiare l'aspetto, poi migrare pagina per pagina.
- **Accettazione:**
  - screenshot identici alla baseline dopo l'introduzione dei token;
  - componenti con test di accessibilità di base.

### Fase 3 — Progettazione della sezione Note (M) — ✅ specifica approvata (`docs/spec-note-live.md`); L1–L7, M1–M3, V1–V11 realizzati
- **Deliverable:**
  - specifica funzionale approvata di:
    - lettura in prova;
    - modalità Live;
    - modifica sicura;
    - stati offline (sezione 8);
  - prototipo statico o screenshot.
- **Prerequisiti:** decisioni D2, D3, D4.
- **Skill:** `spec-driven-development`, `mg30-studio-ux`.
- **Rischi:** nessuno sul codice.
- **Accettazione:** i 9 scenari della sezione 8 hanno comportamento atteso e test associato.

### Fase 4 — Architettura frontend e componenti condivisi (L) — 🔶 in corso (2026-10-26)

**Fatto:**
- `applyJsonToPreset` e `parseDirectJsonInput` spostati in `src/lib/preset-json.ts`, con test di caratterizzazione sull'output attuale;
- `AppShell` nel layout principale: la shell non si rimonta più a ogni pagina e le richieste SysEx alla pedaliera navigando fra 5 pagine scendono da 4 a 2;
- editor diviso in `EditorHeader`, `SignalChain`, `BlockParamsPanel`, `CopySceneDialog`, `AiModeDialog`: `editor/page.tsx` passa da 1189 a 262 righe. Log MIDI e schermate identici prima e dopo;
- un solo elenco di blocchi di partenza (`src/lib/default-effects.ts`, EQ dopo l'AMP come già in 127 slot su 128): lo slot attivo all'avvio non mostra più un ordine diverso dagli altri. Gli stessi messaggi MIDI vengono inviati, alcuni in ordine diverso.

**Aperto:**
- **alias unificati (M2):** cambia il risultato della lettura del JSON, quindi va fatto con i test di caratterizzazione come riferimento e solo con una differenza voluta;
- **codice morto:** in attesa di D5/D9;
- **ordine della catena per preset (nuovo):** sulla MG-30 la catena non è fissa e i blocchi si possono spostare in ogni preset (conferma dell'utente). L'app non legge né invia l'ordine: mostra sempre l'ordine di partenza. Servirebbe il formato SysEx dell'ordine della catena, oggi non documentato. Fuori ambito finché non richiesto.
- **Deliverable:**
  - estrazioni dall'editor: `EditorHeader`, `SignalChain`/`BlockCard`, `BlockParamsPanel`, `AiModeDialog`, `CopySceneDialog`, `useEditorMidiActions`;
  - `applyJsonToPreset` spostato in `src/lib` e unificato con gli alias del normalizzatore;
  - `AppShell` in un layout condiviso;
  - un solo `createDefaultEffects`;
  - rimozione del codice morto **solo** dopo verifica di import, route e usi indiretti, e dopo D5/D9.
- **Skill:** `frontend-ui-engineering`, `vercel-composition-patterns`, `code-simplification`.
- **Rischi:** medio-alto. Gli effetti MIDI legati al montaggio vanno preservati.
- **Accettazione:**
  - nessun cambiamento visivo o di comportamento (screenshot e log MIDI invariati);
  - `editor/page.tsx` sotto le 300 righe.

### Fase 5 — Implementazione progressiva delle pagine (L) — ✅ completata (2026-10-26)

**Fatto:**
- **Note e Live:** PR #16 e #17.
- **Navigazione:** barra mobile Editor · Library · Note · Band · Altro, con pannello "Altro" (sezioni, pedaliera, account); sidebar a gruppi in italiano; titoli corretti (N1, N2, N5).
- **Editor:** intestazione su due righe; SALVA intero a 360px; azioni secondarie nel menu ⋮ sotto i 1024px (E1, E10).
- **Testo minimo a 12px:** l'unica eccezione sono i badge di stato ON/OFF, a 10px.

- **Colori di stato ai token (M7):** prima i valori identici, con schermate identiche; poi i toni quasi identici (log MIDI, titoli "Elimina"). Restano scritti a mano per scelta la palette della Live, il grigio dei blocchi in bypass e i colori delle sezioni (annotato nella skill).
- **Ordine** (impatto alto e rischio basso per primi):
  1. Note: lettura, Prec/Succ, stato di salvataggio, modalità Live;
  2. Editor: header mobile, catena, manopole;
  3. Library;
  4. Home, Settings, Band, Strumentazione;
  5. SysEx.
- **Regola:** commit visivi separati da quelli di comportamento.
- **Skill:** `incremental-implementation`, `mg30-studio-ux`, `frontend-ui-engineering`.
- **Rischi:** medio per pagina, contenuto da PR piccole.
- **Accettazione:** checklist della skill superata per ogni pagina; scenari Note verdi.

### Fase 6 — Ottimizzazione e accessibilità (M, in parallelo a F5) — ✅ completata (2026-10-26)

**Esito.**

Ridisegni misurati con uno script Playwright che conta i componenti React ridisegnati a ogni commit, sullo stesso build di produzione e con la pedaliera simulata:

| Scenario (editor, blocco Amp) | Prima (`main`) | Dopo | Riduzione |
|---|---|---|---|
| 30 CC in entrata (gain) | 117.000 | 4.741 | circa 25× |
| 30 CC in entrata non mappati | 58.500 | 0 | — |
| Trascinamento di 40px | 79.824 | 3.713 | circa 21× |
| 10 tasti freccia | 39.000 | 2.481 | circa 16× |
| Campo numerico "37" + Invio | 11.702 (4 CC inviati) | 1.529 (1 CC) | circa 8× |

- Il menu dei 128 preset si aggiorna una volta a fine gesto, non a ogni frame.
- Log MIDI dell'editor (12 azioni) identico a prima.
- Confronto pixel: 40 schermate su 40 identiche, compresi font e chip ON/OFF spostato.
- Regressioni Playwright tutte verdi.
- Nuovo controllo `check-f6`, 26/26:
  - campo numerico, Esc, undo, regolazione fine;
  - preset conservato al cambio slot e pagina;
  - chip ON/OFF, titoli, font.
- **axe-core** (9 pagine × 390/1280px): nessuna violazione critica o seria, tranne `meta-viewport` (zoom bloccato, **voluto per D3**).
  - Restano violazioni moderate:
    - `page-has-heading-one`;
    - `heading-order`;
    - `region` della sidebar.
  - Rimandate alla Fase 7.
- **Font offline:** dopo una prima visita, con la rete spenta Outfit viene caricato dalla cache della PWA.
- **Da provare su dispositivo reale:** regolazione fine con il dito, area di tocco del chip ON/OFF.

- **Deliverable:**
  - selettori Zustand con `useShallow`;
  - `memo` su blocchi e manopole;
  - log MIDI in uno store separato;
  - commit del trascinamento a fine gesto;
  - debounce dell'input numerico;
  - regolazione fine su touch;
  - `aria-pressed`, titoli, `lang="it"`;
  - zoom secondo D3;
  - `next/font`.
- **Skill:** `vercel-react-best-practices`, `performance-optimization`, subagent `web-performance-auditor`.
- **Rischi:** medio (memoizzazione e stato).
- **Accettazione:**
  - re-render misurati prima e dopo con React Profiler;
  - nessuna regressione negli screenshot;
  - audit di accessibilità senza errori bloccanti.

### Fase 6.2 — Serbatoio dei brani e playlist: modello dati e migrazione (M) — 🔶 in corso (specifica approvata)
Richiesta dell'utente del 2026-10-26: brani in un serbatoio unico, scalette trattate come playlist. Specifica in `docs/spec-playlist.md`; sostituisce D7.
- **Deliverable:**
  - tipi `Playlist` (documenti `setlists` con `items` e preset per playlist) e operazioni pure sulle playlist (aggiungi, togli, riordina, sostituisci, posizione, preset effettivo);
  - funzione pura di migrazione con unione dei soli duplicati identici;
  - esecutore della migrazione con marcatore `users/{uid}/settings/notesModel`;
  - cache locale delle playlist;
  - nessun cambio visibile.
- **Rischi:** alto, perché scrive dati reali. Nessuna cancellazione, piano testato, idempotenza.
- **Accettazione:** test unitari della migrazione e delle operazioni; scenari della §8 della specifica.

### Fase 6.3 — Pagina Note su serbatoio e playlist (L)
- **Deliverable:**
  - PL1–PL11: vista "Tutti i brani", vista playlist, "Aggiungi brani", "Togli dalla playlist", "Aggiungi a playlist…", "Crea versione", avviso di brano condiviso;
  - navigazione, Live e V11 per playlist (`playlist=` nell'URL);
  - import e PDF adeguati;
  - foglio del brano senza i campi band e scaletta.
- **Rischi:** medio-alto, perché tocca tutta la sezione Note.
- **Accettazione:** Playwright PL1–PL11 e Live su due playlist con un brano comune; nessuna regressione negli scenari Note esistenti.

### Fase 6.4 — Pagina Band, pulizia e documentazione (M)
- **Deliverable:**
  - pagina Band con band e playlist reali (crea, rinomina, elimina, conteggio brani), senza scalette "derivate dalle note";
  - rimozione della pagina orfana `/notes/editor` (N6), che scriverebbe il modello vecchio;
  - aggiornamento della skill `mg30-studio-ux` e dello stato dell'audit.
- **Accettazione:** Playwright della pagina Band; typecheck e test verdi.

### Fase 7 — Verifica finale e regressioni (S)
- **Deliverable:**
  - regressione completa dei flussi essenziali, comprese le Fasi 6–6.4;
  - migrazione delle playlist provata su un account Google reale con backup;
  - viewport;
  - salvataggio e import/export;
  - scenari Note su dispositivo reale;
  - aggiornamento di `README.md`, `docs/blueprint.md` e `docs/backend.json`;
  - report finale con attività completate, problemi residui e rischi noti.
- **Skill:** `test-driven-development`, `code-review-and-quality`, subagent `test-engineer` e `code-reviewer`.
- **Accettazione:** ogni voce P0/P1 risolta o documentata come rischio accettato.

---

## 8. Proposta per la sezione Note su mobile

Requisiti di dettaglio, scenari e stato attuale sono nella skill: `.agents/skills/mg30-studio-ux/references/live-notes.md`. Qui la sintesi dei flussi e della struttura.

### 8.1 Flussi

1. **Preparazione (scrivania):**
   - creazione dei brani;
   - organizzazione in band e scaletta;
   - collegamento del preset;
   - riordino in modalità "Riordina".
2. **Prova (sala):**
   - apertura dalla scaletta;
   - lettura;
   - piccola modifica (appunto, accordo) con stato di salvataggio visibile;
   - Prec/Succ.
3. **Live (palco):**
   - "Avvia live" sulla scaletta;
   - sola lettura, testo grande;
   - Succ con un tocco o con un pedale Bluetooth;
   - nessuna azione distruttiva;
   - preset inviato in modo visibile.

### 8.2 Struttura dell'interfaccia (mobile, 360px)

```
Lista (scaletta filtrata)               Lettura in prova                  Modalità Live [P]
┌───────────────────────────┐           ┌───────────────────────────┐     ┌───────────────────────────┐
│ Band ▾   Scaletta ▾   🔍  │           │ ✕  Titolo del brano   ✎   │     │ 3/12  Titolo        🔒 A− A+│
│ [▶ Avvia live]            │           │    su due righe           │     │                           │
│ 1  Brano A      03B·S2  ⋮ │           │ Preset 03B · S2  ✓ inviato│     │ INTRO ▌ G   D   Em  C     │
│ 2  Brano B      05A·S1  ⋮ │           │ INTRO  G  D  Em  C        │     │ VERSE ▌ G   D   C   C     │
│ 3  Blocco note          ⋮ │           │ VERSE  G  D  C  C   x2    │     │   testo grande, contrasto │
│ …                         │           │ testo sezione             │     │   alto, nessun comando    │
│                           │           │ …                         │     │   di modifica             │
│                           │           ├───────────────────────────┤     ├───────────────────────────┤
│ [Home][Lib][Edit][Note][…]│           │  ◀ Prec    3/12   Succ ▶  │     │  ◀ Prec    3/12   Succ ▶  │
└───────────────────────────┘           └───────────────────────────┘     └───────────────────────────┘
```

### 8.3 Specifica funzionale

**Esistente da mantenere**
- foglio a schermo intero;
- lettura predefinita;
- "successivo" nella scaletta;
- wake lock;
- cache locale;
- stato del foglio nell'URL;
- invio del preset (salvo D2).

**Da correggere**
- NT1, NT2, NT3 (Fase 0);
- NT4, NT8, NT13, NT14, NT15, NT17 (Fase 5).

**Nuovo [P]**
- **Lettura in prova:**
  - barra inferiore Prec/posizione/Succ;
  - chip del preset con stato dell'invio;
  - popover degli accordi;
  - titolo su 2 righe.
- **Modalità Live:**
  - avvio esplicito; sola lettura;
  - A−/A+ con preferenza per dispositivo (base: accordi 28px, testo 22px);
  - alto contrasto, con il colore di sezione come barra laterale;
  - blocco anti-tocco (uscita con pressione prolungata);
  - tasti freccia, PagGiù e Spazio per i pedali "page turner";
  - indicatore del wake lock;
  - schermo intero facoltativo.
- **Modifica sicura:**
  - rilevamento delle modifiche non salvate;
  - `SaveStatus`;
  - conferma all'uscita;
  - Indietro che chiude il foglio;
  - Salva disabilitato durante il salvataggio;
  - target ≥44px e annullamento per rimozioni;
  - campo visibile con tastiera (`dvh`, `visualViewport`).
- **Offline:**
  - lettura dalla cache (esiste già);
  - per le scritture va prima verificato il comportamento della coda di Firestore. Solo dopo si può mostrare "Salvato sul dispositivo, in attesa di sincronizzazione"; finché non è verificato non si promette nulla.

**Fuori ambito finché non richiesti:** auto-scroll, swipe tra brani, controllo delle note dalla pedaliera via MIDI, unificazione band/scalette (D7).

**Vantaggi e limiti della modalità Live**
- **Vantaggi:**
  - leggibilità;
  - zero tocchi accidentali distruttivi;
  - navigazione a pedale;
  - stato del preset sempre visibile.
- **Limiti:**
  - è una vista in più da mantenere;
  - la Fullscreen API ha comportamento diverso su iOS;
  - il pedale Bluetooth va verificato con i modelli reali dell'utente.
- **Integrazione:** riusa `NoteSheet`, il modello `SavedNote` e la navigazione esistente (`note-navigation.ts` + nuovo `getPreviousNoteInSetlist`). **Nessun cambio al formato dei dati.**

---

## 9. Strategia di test

### 9.1 Baseline (Fase 0)
- `npm run typecheck`, `npm run test`, `npm run build`: eseguiti, §2.5.
- Screenshot Playwright di tutte le route ai 4 viewport, da non loggati.
  - Per le Note: `page.addInitScript` che scrive in `localStorage['mg30-notes-cache']` una scaletta di prova realistica (brani e blocchi con accordi, sezioni e preset), così lista e foglio sono testabili senza login né rete.
  - **Da eseguire, non ancora fatto.**

### 9.2 Verifiche automatiche
- **Test `node:test` sulla logica pura**, estratta dove serve:
  - payload di salvataggio del blocco (NT1);
  - reducer delle modifiche non salvate (NT2);
  - selezione della nota caricata (NT3);
  - precedente e successivo (NT7);
  - etichetta slot;
  - mappatura tipo di blocco → CC nell'editor (K1);
  - indice di inserimento accordi (NT11);
  - ordine dell'import (S3).
- **Playwright** (script nel repository solo con D10, altrimenti nell'ambiente di sviluppo):
  - assenza di scroll orizzontale a 360px;
  - target ≥44px sui comandi principali;
  - scenari Note 1, 3, 5, 6 con cache iniettata;
  - confronto degli screenshot prima e dopo ogni fase visiva.

### 9.3 Verifiche manuali
- **PWA installata:** iOS (Safari, standalone) e Android (Chrome): safe area, tastiera, `dvh`, wake lock.
- **MG-30 reale:**
  - invii delle manopole su tutti i 12 blocchi (K1);
  - preset all'apertura delle note (NT4);
  - sync e salvataggio (E5, E6).
- **Luce:** lettura a circa 1m al buio e in luce intensa (scenari 2 e 7).

### 9.4 Scenari Note

| # | Scenario | Stato oggi | Test |
|---|---|---|---|
| 1 | Aprire rapidamente una nota pertinente | Esiste | Playwright: ≤2 tocchi dalla scaletta filtrata |
| 2 | Leggere senza zoom | Parziale | Misura di dimensioni e contrasto; dispositivo |
| 3 | Brano successivo | Esiste (solo Succ) | Playwright: ▶ apre il brano corretto, scroll in cima (oggi [H] fallisce, NT8) |
| 4 | Modificare e vedere che è salvato | Da progettare | Test su `SaveStatus` + Playwright |
| 5 | Interruzione senza perdita | **Fallisce** (NT2) | Test sul reducer + Playwright con X e Indietro |
| 6 | Smartphone piccolo | Da verificare | Playwright 360×740 e 390×844 |
| 7 | Luce variabile | Solo tema scuro | Contrasto + dispositivo |
| 8 | Tastiera, dialoghi e barre non si sovrappongono | Da verificare | Dispositivo iOS e Android |
| 9 | Errore di salvataggio o rete | Toast; offline da verificare | Rete disattivata: messaggio veritiero, nessuna perdita |

### 9.5 Regole
- Si dichiarano eseguiti solo i test eseguiti davvero, con il loro esito.
- I problemi preesistenti (avvisi di build, CC MIDI, D8) restano distinti dalle regressioni introdotte dal lavoro.

---

## 10. Decisioni richieste

Solo quelle che non si possono prendere in sicurezza dal codice.

**Decise il 2026-10-25:**
- **D1** → Firestore per utente (`users/{uid}/presets/slot_{n}`) con cache locale ed esportazione/importazione JSON. Implementato (`43c0105`, `d7dc107`).
- **D2** → invio solo all'apertura del brano e con ▶, disattivabile per dispositivo, mai su Annulla e salvataggio. Implementato (`2b97066`). Scegliere slot o scena in modifica invia ancora il comando, come anteprima voluta dall'utente.
- **D3** → pinch-zoom resta bloccato; in Fase 3 si aggiunge il testo regolabile nelle Note.
- **D4** → modalità Live approvata **senza pedale Bluetooth**: schermo intero, avanzamento a tocco, blocco anti-tocco (Fase 3/5).

Restano aperte D5–D10.

| ID | Decisione | Perché serve |
|---|---|---|
| D1 | **Persistenza dei preset**: Firestore per utente, localStorage, export/import JSON su file, o una combinazione | È il P0 S1; non esiste un comando documentato di scrittura nello slot hardware |
| D2 | **Invio automatico del preset dalle Note**: solo all'apertura e con ▶; disattivabile; solo in modalità Live; mai su Annulla e salvataggio | Cambia il suono dal vivo (NT4) |
| D3 | **Zoom**: riattivare il pinch-zoom (WCAG 1.4.4) oppure tenerlo disattivato e compensare con il testo regolabile | Accessibilità contro tocchi accidentali sul palco |
| D4 | **Modalità Live**: approvazione della specifica (schermo intero, pedale Bluetooth, blocco anti-tocco) | Nuova funzionalità |
| D5 | **Pagine e strumenti secondari**: `/notes/editor` orfana, SysEx Analyzer, troubleshooting Firebase in Settings — rimuovere, nascondere o spostare in "Avanzate" | Riduzione di complessità e navigazione |
| D6 | **Tema chiaro / alto contrasto** per l'uso all'aperto | Nuova funzionalità |
| D7 | **Band e scalette**: unificare il doppio modello (collezioni contro stringhe nelle note) | ✅ Decisa il 2026-10-26: serbatoio unico e playlist (Fasi 6.2–6.4, `docs/spec-playlist.md`) |
| D8 | **Verifica su hardware** delle CC del blocco `vol` e di quelle mancanti (già segnalate), e dell'utilità di "Sync Hardware" | Rischio sul controllo reale della pedaliera |
| D9 | **Rimozione di dipendenze e componenti inutilizzati** (Appendice B) | Modifica di `package.json` |
| D10 | **Nuove devDependency**: ESLint con configurazione e Playwright/axe nel repository, per test e2e e CI | Nuove dipendenze |

---

## 11. Prossimo intervento consigliato

La Fase 0 è completata (§0). Prossimi passi:
1. **Prova sul campo delle correzioni:** manopole di Gate, Compressore e Modulazione con la MG-30 collegata (K1); modifica e chiusura delle note su un telefono reale (NT2).
2. **Decisioni D1–D4** (§10): sbloccano la persistenza dei preset (ultimo P0 aperto) e la progettazione delle Note (Fase 3).
3. **Fase 1:** contrasto, verifica su dispositivo delle ipotesi residue (safe area iOS, foglio `100vh`, tastiera) e proposta di architettura informativa. Include l'header mobile dell'editor (E1, ora verificato).

---

## Appendice A — Duplicazioni [V]

- **Etichetta slot (`01A`), 10 copie:**
  - `editor/page.tsx:397`, `library/page.tsx:23`, `use-midi-store.ts:108`;
  - `notes/page.tsx:505,822`;
  - `NoteEditorContent.tsx:240,501`;
  - `notes/editor/page.tsx:153,384`.
- **`SECTION_COLORS`:** `notes/page.tsx:36`, `NoteEditorContent.tsx:27`, più i colori di stampa in `globals.css:191-197`.
- **`CHORD_ROOTS`/`CHORD_TABLE`:** `NoteEditorContent.tsx:37-56`, `notes/editor/page.tsx:49-68`.
- **Due `ChordPicker` diversi:** `NoteEditorContent.tsx:66`, `notes/editor/page.tsx:707`.
- **Tipi delle note ridefiniti:** `notes/editor/page.tsx:27-47` contro `src/types/note.ts`.
- **`createDefaultEffects`:** `use-preset-store.ts:5` e `use-midi-store.ts:114`, con ordine ir/eq diverso.
- **Alias dei parametri:** `editor/page.tsx:49-62` contro `mg30-preset-normalizer.ts:38-47`.

## Appendice B — Codice e dipendenze apparentemente inutilizzati

Da verificare prima di qualsiasi rimozione: import, route dinamiche, usi indiretti, configurazioni.

- **Componenti shadcn mai importati:** accordion, calendar, carousel, chart, checkbox, form, menubar, radio-group, scroll-area, table, tabs.
- **Codice non importato:**
  - `src/lib/placeholder-images.*`;
  - `src/lib/firebase.ts`;
  - `src/firebase/auth/use-user.tsx`;
  - helper `useCollection`/`useDoc`/`non-blocking-*`;
  - flow `summarizePreset` (usato solo da `ai/dev.ts`).
- **Dipendenze non importate in `src/`:** `@ai-sdk/google`, `ai`, `@google/generative-ai`, `@genkit-ai/ai`, `@genkit-ai/core`, `@genkit-ai/firebase`, `@genkit-ai/next`, `@genkit-ai/vertexai`, `@hookform/resolvers`, `date-fns`, `sharp`, `zod`.
  - Alcune potrebbero servire a Genkit o al runtime: **verificare**.
- **Configurazione inutilizzata:**
  - domini immagini `placehold.co`, `unsplash`, `picsum` (`next.config.ts`);
  - `manifest: '/manifest.json'` (`layout.tsx:32`);
  - keyframe Tailwind `pulse-fast`, `spring-in`, `spring-bounce`, `fade-in-up`;
  - token `font-headline`/`font-code`.
- **Dipendenze usate ma non dichiarate:** `@dnd-kit/utilities` (`notes/page.tsx:15`), `tsx` (test runner).
