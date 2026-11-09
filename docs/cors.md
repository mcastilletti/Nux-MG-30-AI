# CORS del bucket Storage

`cors.json` configura il bucket Firebase Storage (loghi delle band, `src/app/bands/page.tsx`). Non e' applicato in automatico: va caricato a mano.

```bash
gcloud storage buckets update gs://studio-3261187179-ec15d.appspot.com --cors-file=cors.json
```

- Gli origin sono espliciti. Prima di applicare il file aggiungi il dominio di produzione di Firebase App Hosting (`https://<backend>--studio-3261187179-ec15d.<regione>.hosted.app` o il dominio personalizzato): non e' presente nel repo.
- Se il bucket ha un altro nome, controlla `storageBucket` in `src/firebase/config.ts`.
- Dopo l'applicazione verifica da produzione il caricamento di un logo band. Se fallisce con un errore CORS, manca un origin nell'elenco.
