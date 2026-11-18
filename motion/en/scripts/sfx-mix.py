"""Mélange les effets sonores relevés dans les scènes (work/sfx-cues.json, scripts/sfx-cues.mjs) à la voix du film
→ work/voix-sfx.wav (48 kHz stéréo), et fait lire cette piste par la ligne de temps (work/timeline.json « audio »).
Le mixage du skill (mixage.py) pose ensuite la musique dessous, au niveau dessiné d'après la voix.
Les gains des sons sont ceux du film K2 V2 (voix à −17 dB RMS) : ils suivent le niveau réel de la voix.
Usage (depuis motion/, après chaque `musique.py plan --ecrire` ou `cale`, qui remettent master.wav) :
    python3 scripts/sfx-mix.py
"""
import json, os, subprocess
import numpy as np
from scipy.io import wavfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SR = 48000
REF_VOICE_RMS = -17.0   # le niveau de voix sur lequel les gains du film K2 V2 ont été réglés


def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def rms_db(x):
    m = np.abs(x).max(axis=1); x = x[m > 1e-4]
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    work = os.path.join(ROOT, 'work')
    tl_p = os.path.join(work, 'timeline.json'); TL = json.load(open(tl_p))
    voice = load(os.path.join(work, 'master.wav'))   # la voix seule (musique.py la réécrit)
    cues = json.load(open(os.path.join(work, 'sfx-cues.json')))
    off = rms_db(voice) - REF_VOICE_RMS
    bus = np.zeros_like(voice); cache = {}
    for t, nm, gdb, opt, _scene in cues:
        if nm not in cache: cache[nm] = load(os.path.join(work, 'sfx', nm + '.wav'))
        x = cache[nm].copy()
        if 'dur' in opt: x = x[: int(opt['dur'] * SR)]
        f = int(opt.get('fade', 0.02) * SR)
        if f > 0 and len(x) > 2 * f:
            x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
        x *= 10 ** ((gdb + off) / 20)
        a = int(round(t * SR))
        if a < 0: x = x[-a:]; a = 0
        b = min(len(bus), a + len(x))
        if b > a: bus[a:b] += x[: b - a]
    out = voice + bus
    pk = float(np.abs(out).max())
    wavfile.write(os.path.join(work, 'voix-sfx.wav'), SR, out.astype(np.float32))
    TL['audio'] = 'voix-sfx.wav'; TL['audio_voix'] = 'master.wav'
    json.dump(TL, open(tl_p, 'w'), ensure_ascii=False)
    kinds = {}
    for c in cues: kinds[c[1]] = kinds.get(c[1], 0) + 1
    print(f"SFX_MIX {len(cues)} sons · voix {rms_db(voice):.1f} dB RMS (gains K2 {off:+.1f} dB) · sons seuls {rms_db(bus):.1f} dB RMS · crête {20*np.log10(pk+1e-9):.1f} dBFS")
    print("SFX_MIX work/voix-sfx.wav → timeline.json « audio » (la voix seule reste master.wav)")


if __name__ == '__main__':
    main()
