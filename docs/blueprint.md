# MG30 Studio: blueprint

Sintesi di cosa fa l'app e di come appare. Dettagli e decisioni sono in `docs/audit-ux-frontend.md`, nelle specifiche `docs/spec-*.md` e nella skill `mg30-studio-ux`.

## Funzionalità principali

- **Connessione Web MIDI** con la NUX MG-30: rilevamento automatico, stato della connessione sempre visibile, errori MIDI mostrati nell'interfaccia.
- **Editor dei preset:**
  - catena effetti con chip ON/OFF;
  - pannello del blocco con modello e manopole;
  - 3 scene per preset;
  - annulla/ripristina;
  - invio e lettura dalla pedaliera.
- **Library:**
  - 128 slot;
  - salvataggio nel proprio account o sul dispositivo;
  - esportazione e importazione in JSON.
- **AI Mode:** parametri generati da testo, tenendo conto della strumentazione configurata (chitarre e amplificatori).
- **Note dei brani:**
  - serbatoio unico di brani e blocchi;
  - playlist per band, con preset proprio per brano;
  - versioni dei brani;
  - foglio di lettura con testo regolabile;
  - modalità Live per il palco;
  - backup in JSON.
- **SysEx Analyzer:** strumento avanzato per analizzare i messaggi SysEx della pedaliera.

## Linee guida di stile

- **Tema:** scuro, tema "strumento da palco"; colori come token in `src/app/globals.css` (`primary`, `success`, `warning`, `destructive`, colori dei blocchi `--block-*`).
- **Font:** Outfit per testo e titoli, Source Code Pro per valori e dati MIDI; inclusi nel progetto (`next/font/local`).
- **Lingua:** l'interfaccia è in italiano (`lang="it"`).
- **Mobile prima di tutto:**
  - comandi di almeno 44px (64px in Live);
  - nessun testo sotto 12px salvo i badge;
  - barra di navigazione in basso su smartphone e barra laterale da tablet in su;
  - safe area rispettate.
- **Accessibilità:**
  - un titolo principale per pagina;
  - pulsanti con nome;
  - stati comunicati anche con `aria-pressed`;
  - contrasto almeno 4,5:1;
  - lo zoom resta bloccato per scelta (decisione D3), compensato dal testo regolabile.
- **Icone:** Lucide React.
