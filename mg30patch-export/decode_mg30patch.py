#!/usr/bin/env python3
"""Decodifica un file .mg30patch (export QuickTone "All Patch": 128 preset) in JSON/CSV.

Uso:  python3 -I decode_mg30patch.py FILE.mg30patch [cartella_output]
Formato (ricavato per reverse engineering, verificato sui 128 preset del file):
  128 record da 9902 byte:  u32 slot(0-based) | 3 scene x 142 byte | u32 flag IR | nome IR (32) | WAV 8228 | 1208 byte (n.d.)
  scena (142 byte): 0-11 stato blocchi (modello+1, +64 = bypass) | blocchi con [count][params...] | 94-105 ordine catena | 106-121 nome
"""
import sys, os, json, csv, hashlib

R = 9902
ORDER = ['wah', 'compressor', 'efx', 'amp', 'eq', 'noise-gate', 'modulation', 'delay', 'reverb', 'ir', 'sr', 'vol']
# (offset del primo parametro, offset del byte "count")
LAYOUT = {'wah': (13, 12), 'compressor': (16, 15), 'efx': (21, 20), 'amp': (28, 27), 'eq': (37, 36),
          'noise-gate': (50, 49), 'modulation': (55, 54), 'delay': (62, 61), 'reverb': (71, 70),
          'ir': (76, 75), 'sr': (83, 82), 'vol': (87, 86)}

here = os.path.dirname(os.path.abspath(__file__))
MODELS = json.load(open(os.path.join(here, 'models.json')))


def convert(raw, p):
    """raw (0..100 sulla pedaliera, oppure tag+indice per i selettori) -> valore dell'editor."""
    if p is None:
        return raw
    if p['id'].startswith('subdiv'):
        # ordine della pedaliera = lista dell'app al contrario (verificati 214 = 1/4 e 213 = 1/8D); gli indici 0-4 sono ipotesi
        order = list(reversed(['1/4', '1/8D', '1/8', '1/4T', '1/16', '1/8T', '1/32']))
        idx = raw & 0x0F
        return order[idx] if idx < len(order) else f'raw {raw}'
    if p['id'] == 'mode' and p.get('options') and p['options'][0] == 'CHORUS' and len(p['options']) == 3:
        return ['PITCH MODULATOR', 'CHORUS', 'FLANGER'][min(raw & 0x0F, 2)]  # S.C.F. CH/FL: P., CHO, FLG (CHO verificato)
    if p['id'] == 'range':
        return (raw & 0x0F) + 1  # posizione 1-6 del selettore (indice 0-5 + 1; da verificare sul display)
    if p['id'] == 'scale' and p.get('options') == ['MINOR', 'MAJOR']:
        return ['MAJOR', 'MINOR'][raw & 0x0F]  # Harmonizer, verificato sul preset 79 (129 = MINOR)
    if p['id'] == 'mode' and p.get('options') == ['CHORUS', 'VIBRATO']:
        return ['VIBRATO', 'CHORUS'][raw & 0x0F]  # U-Vibe CH/VIB, verificato sul preset 10 (129 = CHO)
    if p.get('options'):
        idx = raw & 0x0F if raw >= 128 else raw
        return p['options'][idx] if idx < len(p['options']) else idx
    lo, hi = p['min'], p['max']
    if p['id'] == 'min' and (lo, hi) == (0, 50):
        return raw
    return round(lo + min(100, raw) / 100 * (hi - lo))


def decode_scene(s):
    blocks = {}
    for bi, t in enumerate(ORDER):
        b = s[bi]
        midx = (b & 63) - 1
        models = MODELS.get(t, [])
        m = models[midx] if 0 <= midx < len(models) else None
        start, cnt = LAYOUT[t]
        n = s[cnt]
        raws = list(s[start:start + n])
        if t == 'wah' and m and m['id'] != 'horsewah':
            raws = [s[13]]  # posizione: vedi nota nel README (modello wah con count 0 = 1 sola manopola)
        params = []
        if m and t == 'ir':
            # blocco IR a 6 slot fissi: la manopola N sta nello slot N (i microfoni occupano 1-2)
            slots = [(p.get('knob', i + 1) - 1, p) for i, p in enumerate(m['parameters'])]
        elif m:
            slots = [(i, p) for i, p in enumerate(m['parameters'][:len(raws)])]
        else:
            slots = [(i, None) for i in range(len(raws))]
        for i, p in slots:
            if i >= len(raws):
                continue
            r = raws[i]
            params.append({'id': p['id'] if p else f'p{i+1}', 'name': p['name'] if p else f'Param {i+1}',
                           'raw': r, 'value': convert(r, p)})
        if not m:
            params = [dict(q, note='modello non presente nell\'app') for q in params]
        blocks[t] = {'enabled': not (b & 64), 'modelIndex': midx,
                     'model': m['id'] if m else None,
                     'modelName': (m['fullName'] if m else f'(modello {midx+1} non presente nell\'app)'),
                     'stateByte': b, 'params': params}
    return blocks


def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else here
    d = open(src, 'rb').read()
    assert len(d) % R == 0, 'dimensione inattesa'
    os.makedirs(os.path.join(out, 'user-ir'), exist_ok=True)
    presets, seen = [], {}
    for n in range(len(d) // R):
        rec = d[n * R:(n + 1) * R]
        assert int.from_bytes(rec[:4], 'little') == n
        sc = [rec[4 + i * 142:4 + (i + 1) * 142] for i in range(3)]
        s = sc[0]
        ir_flag = int.from_bytes(rec[430:434], 'little')
        ir_name = rec[434:466].split(b'\0')[0].decode('latin-1')
        wav = rec[466:466 + 8228]
        wav_file = None
        if wav[:4] == b'RIFF':
            h = hashlib.md5(wav).hexdigest()[:8]
            wav_file = seen.get(h)
            if not wav_file:
                wav_file = f'user-ir/{ir_name or "IR"}_{h}.wav'
                open(os.path.join(out, wav_file), 'wb').write(wav)
                seen[h] = wav_file
        p = {
            'slot': n + 1,
            'name': s[106:122].split(b'\0')[0].decode('latin-1').strip(),
            'scenesIdentical': sc[0] == sc[1] == sc[2],
            'chain': [ORDER[i] if i < 12 else i for i in s[94:106]],
            'blocks': decode_scene(s),
            'userIR': {'flag': ir_flag, 'name': ir_name, 'wav': wav_file} if ir_flag or ir_name else None,
            'unverified': {'byte89': s[89], 'byte90': s[90], 'byte91': s[91], 'byte92_maybe_bpm': s[92], 'byte93': s[93],
                           'tail122_141': list(s[122:142])},
        }
        presets.append(p)
    json.dump(presets, open(os.path.join(out, 'presets.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(out, 'presets.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['slot', 'name', 'block', 'on', 'model', 'params (nome=valore)'])
        for p in presets:
            for t in ORDER:
                b = p['blocks'][t]
                w.writerow([p['slot'], p['name'], t, 'ON' if b['enabled'] else 'off', b['modelName'],
                            '; '.join(f"{q['name']}={q['value']}" for q in b['params'])])
    print(f'{len(presets)} preset, {len(seen)} IR utente distinti ->', out)


main()
