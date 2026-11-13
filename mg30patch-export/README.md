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
- **Non verificato:** Sub Div (verificati 214 = 1/4 e 213 = 1/8D; gli indici 0-4 dell’ordine invertito sono ipotesi), wah (modelli non presenti nell'app, nessun wah attivo nel file), byte 89-93 e 122-141 (campo `unverified`; il byte 92 vale ~120 e potrebbe essere il BPM).
- Modelli della pedaliera assenti nell'app: wah #4 (14 preset), compressore #8 e #12 (1 preset ciascuno): riportati come `Param N` grezzi.

## Verifiche sulla pedaliera
Confermati: Horse Wah (Contour + Range a 6 posizioni), Sub Div 214 = 1/4 e 213 = 1/8D (ordine della pedaliera da 1/32 a 1/4), S.C.F. CH/FL (P., CHO, FLG), U-Vibe CH/VIB (VIB, CHO), Harmonizer (Key, Scale MAJOR/MINOR, Harm, Blend), IR (Mic R122, Axis, Level in dB, estremi di Lo/Hi Cut; posizioni di Lo/Hi Cut del preset 10).
Non verificata: la scala in Hz dei valori intermedi di Lo Cut / Hi Cut (nel JSON è lineare; il valore grezzo 0-100 è esatto).
