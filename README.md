# MG30 Studio

Editor web per la pedaliera multieffetto **NUX MG-30**, con note dei brani per sala prove e palco. Funziona su smartphone, tablet e desktop ed è installabile come PWA.

## Funzionalità
- **Editor dei preset** via Web MIDI:
  - catena effetti;
  - manopole con campo numerico e regolazione fine anche col dito;
  - 3 scene per preset;
  - annulla/ripristina;
  - invio e lettura dalla pedaliera.
- **Library dei preset:**
  - salvataggio nel proprio account (Firestore) o sul dispositivo;
  - esportazione e importazione in JSON.
- **AI Mode:** genera i parametri di un preset da una descrizione in linguaggio naturale. Usa Gemini 2.5 Flash tramite Genkit e tiene conto della strumentazione configurata.
- **Note dei brani:**
  - tutti i brani e i blocchi di testo stanno in un **serbatoio unico**;
  - le **playlist** delle band ne definiscono l'ordine e possono impostare un preset proprio per ogni brano;
  - con **Crea versione** si duplica un brano solo quando serve davvero.
- **Modalità Live:**
  - testo grande ad alto contrasto;
  - Prec/Succ e scelta libera del brano;
  - invio automatico del preset;
  - blocco anti-tocco;
  - schermo sempre acceso.
- **Pagina Band:** band e playlist, con logo della band.
- **Backup delle note** in JSON dal menu ⋮ della pagina Note. Contiene tutte le note, le band e le playlist.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:9003
npm run test       # test unitari (node:test via tsx)
npx tsc --noEmit   # controllo dei tipi (la build non blocca sugli errori TS)
npm run build      # build di produzione
```

- **AI Mode:** serve una chiave in `.env`, alla voce `GOOGLE_GENAI_API_KEY`. La chiave si ottiene su [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Firebase** (autenticazione Google, Firestore, Storage per i loghi): la configurazione è in `src/firebase/`, le regole di sicurezza in `firestore.rules`.
- **Font:** Outfit e Source Code Pro sono inclusi nel progetto (`src/fonts/`, licenza OFL) e caricati con `next/font/local`. La build non scarica nulla da Google, ed è necessario per il deploy su Firebase App Hosting.

## Deploy
- **Produzione:** Firebase App Hosting (`apphosting.yaml`), che pubblica dal branch `main`.
- **Anteprime delle PR:** Vercel.

## Documentazione
- `docs/audit-ux-frontend.md`: audit UX/UI, piano per fasi e stato di avanzamento.
- `docs/spec-note-live.md`: note in sala prove e modalità Live.
- `docs/spec-playlist.md`: serbatoio dei brani e playlist (modello dati, conversione, interfaccia).
- `docs/backend.json`: collezioni Firestore usate dall'app.
- `.agents/skills/mg30-studio-ux/SKILL.md`: regole UX del progetto per chi modifica l'interfaccia.

## Tecnologie
Next.js 15 (App Router), React 19, Tailwind CSS e shadcn/ui, Zustand, Firebase 11, Genkit 1.x.
