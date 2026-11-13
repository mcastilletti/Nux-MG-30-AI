# MG30 Studio — sistema visivo

Direzione **Pedaliera illustrata**: antracite caldo a livelli, un accento giallo per le azioni, il colore delle
categorie per orientarsi senza leggere, e ogni blocco disegnato come ciò che è. Solo tema scuro.

## Principi
- **Si riconosce prima di leggere**: pedale, wah, testata o combo, cassa, pedale d'espressione e scatola S/R hanno
  ciascuno la propria sagoma e il proprio colore di categoria (`src/components/device-art/`).
- **Un solo accento** (giallo) per azioni e selezione; il verde è solo il LED (acceso, collegato, inviato).
- **Poche superfici**: fondo, pannello (`card`), incassato (`inset`), rilievo (`secondary`/`accent`). Niente glow,
  niente ombre colorate; ombre neutre solo per ciò che galleggia (menu, trascinamento, finestre).
- **Mobile prima**: 360 px, bersagli di tocco ≥ 44 px, niente comandi visibili solo al passaggio del mouse.
- **Live**: nero puro, testo grande, contrasto massimo; è l'unica eccezione ai livelli di superficie.

## Colori (token HSL in `src/app/globals.css`)
| Uso | Token | Valore |
|---|---|---|
| Fondo | `background` | #171513 |
| Pannello | `card` | #211e1b |
| Incassato | `inset` | #100f0e |
| Rilievo, hover | `secondary`, `accent` | #2a2622 |
| Bordo | `border` | #34302b |
| Testo | `foreground` | #f4efe6 |
| Testo secondario | `text-soft` / `muted-foreground` | #c4bbae / #a89f92 |
| Accento (azioni, selezione) | `primary` (testo scuro sopra) | #f5c451 |
| LED / successo | `success` | #57d97b |
| Attenzione, errore | `warning`, `destructive` | ambra, rosso |

Categorie dei blocchi (`--block-<tipo>`, classi `bg-block-*`/`text-block-*`):
ampli `#c94436` · drive `#e2763a` · modulazione `#3f73c9` · delay `#2ea1a8` · reverb `#8a62bd` · cassa/IR `#4d93bf` ·
wah `#c2557f` · compressore `#e0b23a` · gate `#4f9a62` · EQ `#9a958c` · send/return `#6f7f86` · volume `#a0907a`;
blocco spento `--block-off` (stesso corpo, senza colore, LED spento).

## Tipografia
Space Grotesk (testo e titoli) e Space Mono (slot, valori, accordi), serviti dall'app (`src/fonts/`, licenza OFL).
Scala: titolo pagina 24/30 px bold · testo 14–16 px · `text-body-sm` 13 · `text-caption` 12 · `text-micro` 11 (solo
etichette sotto le immagini). Slot e valori: `font-code` / `value-mono` (cifre tabulari).

## Forma
Raggio 12 px (pannelli e pulsanti), 10 px per i controlli compatti. Bordi 1 px, nessuna ombra sui pannelli.
Altezza di pulsanti e segmenti: 44 px.

## Componenti di base (`src/components/common/`)
`Panel` (superficie unica: `default`, `inset`, `selected`) · `PageHeader` (unico `h1` della pagina) · `Segmented`
(scene, schede) · `CategoryChip` (nomi brevi e colori) · `IconButton` (44 px, etichetta obbligatoria) ·
`ConfirmDialog` · `EmptyState`/`ErrorState` · `SaveStatus`.

## Editor
Intestazione compatta (slot, nome, scene, Salva) · **catena**: fascia incassata con i dispositivi in ordine, LED,
anello giallo sulla selezione; su telefono scorre con una sfumatura a destra, da `lg` sta in una riga ·
**pannello del blocco**: immagine grande, categoria, nome del modello, bypass e cambio modello (a sinistra da `lg`) ·
**manopole**: anello di 11 punti che si accendono col valore, cappello crema, nome sotto, valore e unità sempre
visibili; doppio clic = valore iniziale del parametro. Il comportamento (store e MIDI) non dipende dall'aspetto.

## Immagini
Disegni vettoriali piatti su griglia 54×70, creati per l'app: nessuna foto né marchio di prodotti reali. Le sagome
sono scelte da `src/lib/device-art-map.ts` a partire dal modello (combo o testata, misura della cassa, tipo di
microfono, numero di manopole del pedale).
