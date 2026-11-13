# Export preset MG-30 (da `MG30AllPatch.mg30patch`)

- `presets.json` – tutti i 128 preset: nome, catena, per ogni blocco modello / ON-OFF / parametri (valore grezzo `raw` e valore dell'editor `value`).
- `presets.csv` – stessa cosa in forma piatta (una riga per blocco).
- `user-ir/` – gli 8 IR utente distinti incorporati nel file (WAV 48 kHz, 16 bit, mono).
- `decode_mg30patch.py` – decodificatore (`python3 -I decode_mg30patch.py FILE.mg30patch`); `models.json` = modelli dell'app.

## Formato (ricavato per reverse engineering)
128 record da 9902 byte: slot (u32) · 3 scene × 142 byte · flag IR (u32) · nome IR (32) · WAV (8228) · 1208 byte non decodificati.
Scena: byte 0-11 stato dei blocchi (indice modello + 1, +64 = bypass) · blocchi come `[count][param…]` · byte 94-105 ordine catena · 106-121 nome.

## Cosa è verificato / cosa no
- Verificato sui 128 preset: stati/modelli (il `count` di ogni blocco coincide sempre con il numero di parametri del modello), nomi, ordine catena, valori 0-100, IR (Mic = byte 76 `0xA0+n`, Axis = byte 77 `0x90+n`).
- Le 3 scene sono identiche in tutti i preset di questo file.
- **Non verificato:** codifica di Sub Div (byte `213/214`, riportato grezzo), wah (modelli non presenti nell'app, nessun wah attivo nel file), byte 89-93 e 122-141 (campo `unverified`; il byte 92 vale ~120 e potrebbe essere il BPM).
- Modelli della pedaliera assenti nell'app: wah #4 (14 preset), compressore #8 e #12 (1 preset ciascuno): riportati come `Param N` grezzi.
