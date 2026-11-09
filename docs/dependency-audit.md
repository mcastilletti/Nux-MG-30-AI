# Audit dipendenze

Ultimo controllo: 2026-11-09 (`npm audit --omit=dev`). Prossima revisione: 2026-12-09.

Stato: 0 critical; 13 high (da 26); 82 totali (da 115). Applicati `next` 15.5.29 e `npm audit fix` senza `--force`.
Installare sempre con `npm ci --ignore-scripts`. Non lanciare `npm audit fix --omit=dev`: poti le devDependencies da `node_modules`.

## High rimasti, differiti

| Pacchetto | Motivo del rinvio | Raggiungibilita' |
|---|---|---|
| `zod` < 4.6.6 | Nessun fix nel ramo 3.x; il passaggio a 4.x e' un major che tocca gli schemi Genkit. | Bassa: gli input dei flussi AI hanno `.max()` su stringhe e array. |
| `firebase`, `@firebase/firestore(-compat)`, `@grpc/grpc-js` | Il "fix" proposto da npm e' un downgrade a firebase 9.14.0. | Bassa: `grpc-js` e' un difetto lato server gRPC, che l'app non espone. |
| `@genkit-ai/core`, `@genkit-ai/firebase`, `@genkit-ai/next` | Fix proposto: downgrade a `@genkit-ai/firebase` 0.5.17 oppure nessun fix. | Media: ricadono in `zod` e `@opentelemetry`; da riverificare a ogni release di Genkit. |
| `@opentelemetry/propagator-jaeger`, `sdk-trace-node` | Transitive di Genkit; aggiornabili solo con Genkit. | Bassa: il propagatore Jaeger non e' configurato. |
| `postcss` (annidato in `next`) | Richiede `next` 16 (major). | Solo build: nessun CSS non fidato viene elaborato. |
| `serialize-javascript`, `openai` | Nessun fix / transitive di tooling. | Solo build o tooling di sviluppo. |

## Da fare

- Valutare `next` 16 e `zod` 4 come upgrade dedicati, uno per volta.
- `genkit-cli` e' in `dependencies` ma serve solo in sviluppo (`genkit:dev`): spostarlo in `devDependencies` riduce la superficie in produzione.
