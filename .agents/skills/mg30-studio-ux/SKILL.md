---
name: mg30-studio-ux
description: Requisiti UX specifici di MG30 Studio AI, l'editor web della pedaliera NUX MG-30 con le note brano per sala prove e live. Usa quando modifichi UI, layout, navigazione, testi o interazioni dell'app, in particolare editor preset, catena effetti, manopole, libreria e sezione Note; quando valuti un'interfaccia per smartphone o per l'uso dal vivo; quando devi decidere se una modifica visiva altera dati, MIDI o persistenza.
---

# MG30 Studio UX

## Panoramica

MG30 Studio AI serve a programmare i suoni della NUX MG-30 e a consultare le note dei brani durante prove ed esibizioni. L'interfaccia è uno strumento di lavoro musicale: precisa, immediata, affidabile e leggibile in condizioni difficili (poca luce, mani occupate, una sola mano libera, pressione del palco). Non è una dashboard amministrativa e non è una vetrina decorativa: ogni elemento deve aiutare a suonare o a preparare il suono.

Questa skill contiene solo ciò che è specifico del prodotto. Per il resto rimanda alle skill generali (vedi "Precedenze").

## Quando usarla

- Modifiche a pagine, componenti, layout, navigazione, testi o stati di `src/app/*` e `src/components/*`.
- Progettazione di nuove funzioni visibili all'utente (es. modalità Live delle Note).
- Revisione di una PR che tocca l'interfaccia.

**Non usarla** per la logica dell'AI (`src/ai/*`), il protocollo MIDI o la persistenza, salvo per valutarne l'effetto visibile (feedback, errori, stati di salvataggio).

## Precedenze tra skill

| Tema | Skill di riferimento | Regola |
|---|---|---|
| Direzione estetica generale | `design-taste-frontend`, `web-design-guidelines` | Valgono salvo dove questa skill è più restrittiva |
| Densità, spaziature, animazioni | **questa skill** | Prevale su `design-taste-frontend`: niente `py-20/28` nei flussi di lavoro, niente animazioni a molla o reveal sfalsati nelle viste live |
| Architettura dei componenti, accessibilità WCAG | `frontend-ui-engineering`, `vercel-composition-patterns` | Applicale integralmente |
| Rendering e prestazioni | `vercel-react-best-practices`, `performance-optimization` | Applicale integralmente |
| Test e verifica | `test-driven-development`, `code-review-and-quality` | Applicale integralmente |

## Fedeltà funzionale (invarianti)

1. **Catalogo MG-30**: modelli, parametri e range esistono solo in `src/lib/mg30-data.ts`. Non inventare effetti, parametri, valori o capacità della pedaliera, neppure come placeholder.
2. **Formati protetti**: non modificare senza piano di compatibilità approvato:
   - tipi `Preset`/`EffectState` (`src/types/preset.ts`), `SavedNote`/`NoteSection` (`src/types/note.ts`), `Guitar`/`Amplifier` (`src/types/instrumentation.ts`);
   - collezioni Firestore `notes`, `bands`, `setlists`, `guitars`, `amplifiers`, `users/{uid}/settings`;
   - chiavi localStorage `mg30-notes-cache`, `mg30-instrumentation`, `nux-mg30-preset-names`, `mg30_notes_filter_band`, `mg30_notes_filter_setlist`.
3. **MIDI**: una modifica visiva non deve aggiungere, togliere o spostare invii MIDI (Program Change, CC di scena, CC dei blocchi). Aprire una nota oggi invia il preset collegato: qualsiasi cambiamento di quando avviene è una modifica di comportamento da dichiarare.
4. **Niente mock**: non sostituire dati o logiche reali con dati fittizi o simulazioni.
5. **Separazione**: i cambiamenti estetici vanno in commit distinti da quelli che cambiano il comportamento.

## Workflow

1. **Contesto d'uso**: stabilisci se il flusso si usa alla scrivania (programmazione), in sala prove (consultazione e piccole modifiche) o dal vivo (sola consultazione rapida). Le regole si irrigidiscono in quest'ordine.
2. **Comportamento reale**: leggi il codice del flusso (stato, persistenza, MIDI, errori) prima di proporre modifiche. Non dedurre il comportamento dai nomi dei componenti.
3. **Mobile-first**: progetta a 360×740, poi estendi a tablet e desktop. Ridefinisci priorità e densità per il mobile, non limitarti a rimpicciolire il desktop.
4. **Applica le regole** delle sezioni seguenti.
5. **Verifica** con la checklist finale e, per le Note, con gli scenari di `references/live-notes.md`.

## Regole mobile e live

**Tocco e raggiungibilità**
- Target touch minimi: 44×44px; 48×48px per i comandi primari usati dal vivo. Le icone senza testo hanno sempre un nome accessibile (`aria-label`), non solo `title`.
- Almeno 8px tra un'azione frequente e una distruttiva; le azioni distruttive non stanno mai dentro un'area che apre o seleziona qualcos'altro.
- Azioni primarie nella metà inferiore dello schermo (zona del pollice). Header con al massimo 3-4 comandi su mobile; il resto va in un menu con etichette.
- Niente controlli che compaiono solo al passaggio del mouse (`opacity-0` + `hover`/`group-hover`): su touch sono invisibili ma toccabili. Niente informazioni solo nei tooltip.
- Un gesto di trascinamento non deve bloccare lo scroll della pagina in modo inatteso (manopole, liste riordinabili).

**Leggibilità**
- Tema scuro attuale: contrasto ≥4.5:1 per il testo normale, ≥7:1 per il testo di lettura live.
- Dimensioni minime: testo d'interfaccia 12px, etichette secondarie 11px, testo di lettura live 18px, accordi 20px. Usa la scala tipografica del design system, non nuovi `text-[Npx]`.
- Lo stato non si comunica solo col colore (ON/OFF, selezione, connessione): affianca testo o icona e, dove serve, `aria-pressed`/`aria-current`.

**Layout e viewport**
- Altezze con `dvh`/`svh` (`min-h-[100dvh]`), mai `100vh`/`h-screen`.
- Considera le safe area iOS (`env(safe-area-inset-*)`) per barre fisse in alto e in basso.
- La tastiera mobile non deve coprire il campo attivo né i comandi di salvataggio; i dialoghi hanno altezza massima e scroll interno.

**Movimento e feedback**
- Rispetta `prefers-reduced-motion` (già gestito globalmente in `globals.css`); nelle viste live niente animazioni decorative.
- Ogni azione dà un esito visibile e veritiero: un toast non deve dichiarare un successo che non è avvenuto (es. "salvato sull'hardware" a pedaliera scollegata).
- Ogni vista dati ha stati di caricamento, vuoto ed errore distinti; l'errore offre un'azione (riprova, accedi).

**Protezione dei dati**
- Le modifiche non salvate sono sempre visibili e protette: uscita, chiusura, "Annulla" e il tasto Indietro chiedono conferma.
- Le azioni distruttive richiedono conferma esplicita o offrono annullamento; mai un singolo tap su un target piccolo.
- Il salvataggio mostra lo stato (Non salvato / Salvataggio… / Salvato / Errore – Riprova) e impedisce invii doppi.

**Lingua**
- Interfaccia in italiano coerente. Termini tecnici della pedaliera (nomi dei modelli, "Scene", "Preset") restano come sul dispositivo.

## Note in sala prove e dal vivo

La sezione Note è uno strumento operativo, non un campo di testo. Priorità: trovare il brano giusto in pochi secondi, leggerlo senza zoom da distanza di pedaliera, passare al brano successivo con un solo gesto, non perdere mai una modifica, non inviare MIDI per errore.

Prima di progettare o modificare la sezione Note leggi `references/live-notes.md`: contiene cosa esiste oggi, gli scenari di accettazione e i requisiti della modalità Live.

## Ancoraggi tecnici del progetto

- **Token e stili**: `src/app/globals.css` (variabili HSL, `.touch-target`, `.section-kicker`, stampa) e `tailwind.config.ts`. Nuovi colori come token semantici, non come `zinc-*`/`emerald-*` o HSL inline:
  - stato: `success`, `warning`, `info`, `destructive` (es. `text-success`, `bg-warning/15`);
  - blocchi della catena: `--block-<tipo>` (es. `hsl(var(--block-amp) / 0.4)`; mai `hsla(H S L, a)`, che è CSS non valido);
  - testo piccolo: `text-label` (10px), `text-caption` (11px), `text-body-sm` (13px), `text-micro` (9px, da eliminare). Niente nuovi `text-[Npx]`; direzione: nessun testo sotto 12px salvo badge.
  - `--primary-foreground` è scuro: sul viola usa `text-primary-foreground`, mai `text-white`.
  - I moduli in `src/lib` sono analizzati da Tailwind: le classi lì dentro vengono generate.
  - **Colori scritti a mano per scelta, da non "correggere":** la palette `zinc-*` della modalità Live (tema palco nero ad alto contrasto, `LiveNoteView.tsx`); il grigio dei blocchi in bypass (`SignalChain.tsx`, `BlockParamsPanel.tsx`); i colori delle sezioni del brano (`src/lib/section-colors.ts` e la stampa in `globals.css`). Tutto il resto usa i token.
- **Componenti**: shadcn in `src/components/ui`. Attenzione: `button.tsx` applica `[&_svg]:size-4`, che annulla le classi di dimensione sulle icone dentro `<Button>`.
- **Componenti comuni** (`src/components/common`), da preferire al markup ad hoc:
  - `IconButton` per ogni pulsante con sola icona (`label` obbligatorio, 44×44px);
  - `ConnectionStatus` per lo stato della pedaliera (mostra anche gli errori MIDI);
  - `SaveStatus` accanto a ogni Salva, con guardia contro il doppio invio;
  - `ConfirmDialog` per eliminazioni e azioni irreversibili;
  - `EmptyState` / `ErrorState` (con Riprova) per liste vuote, caricamento ed errori.
- **Shell e navigazione**: `src/components/layout/app-shell.tsx` (sidebar desktop, barra in basso mobile con 5 voci).
- **Foglio Note**: `src/components/notes/NoteSheet.tsx` su Radix Dialog; stato di apertura in `note-sheet-state.ts`, sincronizzato con l'URL.
- **Schermo sempre acceso**: `src/hooks/use-wake-lock.ts`, attivo su tutte le pagine.
- **Catalogo MG-30**: `src/lib/mg30-data.ts`. **Etichetta slot** (es. `01A`): `formatSlotLabel` e `matchesSlotSearch` in `src/lib/slot.ts`. Colori delle sezioni in `src/lib/section-colors.ts`, accordi in `src/lib/chord-data.ts`.
- **Stato e prestazioni** (Fase 6):
  - leggi gli store Zustand con selettori (`useStore((s) => s.x)` o `useShallow`), mai `useStore()` intero;
  - il log MIDI sta in `useMidiLogStore`, separato;
  - i log di diagnostica passano per `debugLog`, attivo solo in sviluppo;
  - nell'editor i gestori passati ai componenti memoizzati usano `useStableCallback`;
  - il preset arriva in `devicePresets` a fine gesto (`useDeferredPresetCommit`).
- **Manopola** (`rotary-knob.tsx`):
  - il campo numerico invia solo alla conferma (Invio o uscita dal campo); Esc annulla;
  - frecce, campo e trascinamento entrano nell'undo;
  - regolazione fine con Shift o spostando il dito di lato (oltre 48px), con l'etichetta "fine".
  - Non reintrodurre l'invio a ogni carattere.
- **Catena**: il chip ON/OFF è un `button` fratello del blocco, mai annidato nel suo `button`.
- **Accessibilità**:
  - `lang="it"`;
  - titolo della scheda per pagina da `getRouteTitle`;
  - zoom bloccato per scelta (D3): l'unica violazione critica attesa di axe è `meta-viewport`.
- **Safe area**: header, barra in basso e foglio nota usano `env(safe-area-inset-*)`; ogni nuovo elemento fisso ai bordi deve fare lo stesso.
- **Verifica visiva**: Playwright è disponibile nell'ambiente; le note si possono iniettare in `localStorage` (`mg30-notes-cache`) per testare lista e foglio senza login.

## Razionalizzazioni comuni

| Razionalizzazione | Realtà |
|---|---|
| "Su desktop funziona, su mobile basta che si veda" | L'uso principale delle Note è su smartphone, in piedi, con una mano. Progetta a 360px prima. |
| "È solo un ritocco grafico" | Se cambia quando parte un invio MIDI, cosa viene salvato o cosa si può perdere, è un cambio di comportamento. |
| "L'icona è chiara, l'etichetta non serve" | Su touch non c'è hover e `title` non compare; senza nome accessibile il comando è muto per lettori di schermo. |
| "Aggiungo il controllo e lo mostro al passaggio del mouse" | Su touch resta invisibile ma toccabile: è una trappola per tocchi accidentali. |
| "Metto un dato di esempio per vedere il layout" | Valori inventati della pedaliera finiscono in produzione o nei test. Usa il catalogo reale. |
| "Il toast di successo rassicura l'utente" | Un successo falso è peggio di nessun messaggio: l'utente scopre la perdita sul palco. |

## Red flags

- Nuovi `text-[9px]`/`text-[10px]` o target sotto i 44px nei flussi mobile.
- `h-screen`/`100vh`, barre fisse senza safe area, dialoghi senza scroll.
- `onClick` su `div`/`Card` senza ruolo e tastiera; controlli interattivi annidati.
- Chiusura di un editor senza controllo delle modifiche non salvate.
- `sendProgramChange`/`sendSceneChange`/`sendControlChange` aggiunti o spostati in un commit "grafico".
- Campi aggiunti o rinominati in `Preset`, `SavedNote` o nelle collezioni Firestore senza piano di compatibilità.

## Verifica

- [ ] Viewport 360×740, 390×844, 768×1024 e 1280×800: nessuno scroll orizzontale involontario, nessun controllo sovrapposto o fuori schermo.
- [ ] Target touch ≥44px (≥48px per i comandi live) e nomi accessibili su tutti i comandi a sola icona.
- [ ] Contrasto verificato per i testi modificati.
- [ ] Stati di caricamento, vuoto ed errore presenti e veritieri.
- [ ] Nessun invio MIDI aggiunto o spostato, oppure il cambiamento è dichiarato e motivato.
- [ ] Formati di dati e chiavi di persistenza invariati, oppure piano di compatibilità approvato.
- [ ] Per le Note: scenari di `references/live-notes.md` eseguiti o dichiarati non eseguiti.
- [ ] `npm run typecheck` e `npm run test` superati (la build non controlla i tipi).
