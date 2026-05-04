# MG30 Studio (mcastilletti/Nux-MG-30-AI)

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale e pronto per il deployment.

## 🚀 Push su GitHub
Se hai clonato il progetto e vuoi caricarlo sul tuo repository `mcastilletti/Nux-MG-30-AI`, esegui questi comandi nel terminale:

```bash
git init
git remote add origin https://github.com/mcastilletti/Nux-MG-30-AI.git
git add .
git commit -m "Initial commit: MG30 Studio with AI and PDF Fixes"
git branch -M main
git push -u origin main
```

## 🛠 Configurazione Rapida
1.  **Chiave AI**: Ottieni una chiave API su [Google AI Studio](https://aistudio.google.com/app/apikey) e incollala nel file `.env` alla voce `GOOGLE_GENAI_API_KEY`.
2.  **Icona PWA**: Assicurati di salvare la tua icona come `public/icon.png`. L'app è già configurata per impostare lo sfondo giallo (#FFD500) automaticamente su Android.

## ✨ Funzionalità principali
- **Visual Editor**: Controllo completo dei blocchi tramite MIDI e gestione delle **3 SCENE** (CC 80) per ogni preset.
- **AI Mode**: Generazione automatica dei parametri da testo naturale utilizzando **Gemini 2.5 Flash** tramite Genkit v1.x.
- **Note Brani & PDF**: Gestione scalette con accordi e stampa **PDF A4 su pagina singola garantita** (contenuto ridotto del 30% e altezza bloccata per evitare troncamenti).
- **PWA Ready**: Installabile su Android con icona a sfondo giallo (#FFD500) e modalità "maskable" (nessun bordo bianco).

## 💡 Risoluzione Problemi Migrazione
Se il pulsante "Move now" di Firebase Studio è bloccato nonostante tu sia Owner:
1. Premi `Ctrl+Shift+P` (o `Cmd+Shift+P` su Mac).
2. Digita **"Zip & Download"** e premi Invio.
3. Estrai e apri il progetto nel tuo IDE locale (es. VS Code) per continuare lo sviluppo.

## Sviluppo
Basato su **Next.js 15**, **Genkit 1.x**, e **Zustand**.
