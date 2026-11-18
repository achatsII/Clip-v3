"""Bibliothèque de sound design synthétisée (aucun échantillon externe) → work/sfx/<nom>.wav (48 kHz, stéréo).
Reprise du film K2 V2 (intelligence-industrielle/k2-cadence, motion/campagne/scripts/sfx.py) ; « succes » et « recompense » accordés en la majeur (la musique du film).
Usage : python3 -I scripts/sfx.py
"""
import os
import numpy as np
from scipy import signal

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'work/sfx')
rng = np.random.default_rng(2026)


def t_(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def env_ad(d, a, curve=4.0):
    n = int(d * SR); na = max(1, int(a * SR)); e = np.ones(n)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[na:] = np.exp(-curve * np.linspace(0, 1, n - na))
    return e
def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def lp(x, f, order=2):
    sos = signal.butter(order, f, 'lowpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def hp(x, f, order=2):
    sos = signal.butter(order, f, 'highpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def sweep_bp(x, f0, f1, q=2.5, blocks=64):
    """Filtre passe-bande dont la fréquence glisse (par blocs, raccords en fondu)."""
    n = len(x); out = np.zeros(n); B = max(1, n // blocks)
    for i in range(0, n, B):
        k = i / n; fc = f0 * (f1 / f0) ** k
        lo, hi = fc / (1 + 1 / q), min(SR / 2 - 100, fc * (1 + 1 / q))
        seg = x[max(0, i - B):i + 2 * B]
        y = bp(seg, lo, hi)
        a = i - max(0, i - B)
        out[i:i + B] = y[a:a + B][: len(out[i:i + B])]
    return out
def reverb(x, d=1.2, mix=0.3, damp=4000):
    ir = noise(d) * np.exp(-6 * np.linspace(0, 1, int(d * SR))); ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = signal.fftconvolve(x, ir)[: len(x) + int(d * SR)]
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry * (1 - mix) + wet * mix
def stereo(x, pan=0.0, width=0.0):
    """pan −1 (gauche) … 1 (droite) ; width : léger décalage pour élargir."""
    l = x * np.sqrt((1 - pan) / 2) * 1.414; r = x * np.sqrt((1 + pan) / 2) * 1.414
    if width > 0:
        dl = int(width * SR); r = np.concatenate([np.zeros(dl), r])[: len(r)]
    return np.stack([l, r], 1)
def norm(x, peak=0.8): m = np.max(np.abs(x)) + 1e-9; return x * (peak / m)
def save(name, x):
    import wave
    if x.ndim == 1: x = stereo(x)
    x = np.clip(x, -1, 1)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print('✓', name, f'{len(x) / SR:.2f} s')


def whoosh(d=0.6, f0=300, f1=3200, pan0=-0.6, pan1=0.6, peak=0.7, a=0.62):
    x = sweep_bp(noise(d), f0, f1, q=1.6)
    e = env_ad(d, a * d, curve=5.0); x = x * e
    # panoramique glissant
    p = np.linspace(pan0, pan1, len(x))
    st = np.stack([x * np.sqrt((1 - p) / 2), x * np.sqrt((1 + p) / 2)], 1) * 1.414
    return norm(st, peak)
def tap(peak=0.55):
    d = 0.09; t = t_(d)
    click = hp(noise(d), 2500) * np.exp(-t * 900)
    body = np.sin(2 * np.pi * 1450 * t) * np.exp(-t * 70) * 0.5 + np.sin(2 * np.pi * 620 * t) * np.exp(-t * 60) * 0.35
    return norm(click * 0.6 + body, peak)
def pop(peak=0.5, f0=520, f1=980):
    d = 0.16; t = t_(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 40))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 26) + 0.15 * np.sin(2 * ph) * np.exp(-t * 40)
    return norm(x, peak)
def tick(peak=0.35):
    d = 0.06; t = t_(d)
    x = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 120) + hp(noise(d), 4000) * np.exp(-t * 300) * 0.3
    return norm(x, peak)
def chime(notes=(1318.5, 1975.5, 2637.0), d=1.6, peak=0.5, spread=0.045):
    n = int(d * SR); x = np.zeros(n)
    for i, f in enumerate(notes):
        t = t_(d - i * spread)
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)) * np.exp(-t * 3.2) * (1 - np.exp(-t * 400))
        x[int(i * spread * SR):int(i * spread * SR) + len(s)] += s
    return norm(reverb(x, 1.4, 0.35), peak)
def sparkle(peak=0.4):
    d = 1.4; x = np.zeros(int(d * SR))
    for i in range(14):
        f = rng.uniform(2500, 6200); t0 = rng.uniform(0, 0.7); t = t_(0.35)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 18) * rng.uniform(0.3, 1)
        a = int(t0 * SR); x[a:a + len(s)] += s
    return norm(reverb(x, 1.2, 0.4, 7000), peak)
def impact(peak=0.95, d=2.6):
    t = t_(d)
    f = 30 + 70 * np.exp(-t * 7)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8)
    hit = lp(noise(d), 900) * np.exp(-t * 14) * 0.9
    crack = hp(noise(d), 3000) * np.exp(-t * 40) * 0.25
    x = sub * 1.0 + hit + crack
    return norm(reverb(x, 2.4, 0.38, 2500), peak)
def riser(d=2.6, peak=0.6):
    t = t_(d)
    x = sweep_bp(noise(d), 200, 6000, q=2.2) * (t / d) ** 2.2
    f = 110 * 2 ** (3 * t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 3 * 0.35
    y = x + tone
    y[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))
    return norm(y, peak)
def heartbeat(peak=0.85):
    d = 0.75; x = np.zeros(int(d * SR))
    for t0, g in [(0.0, 1.0), (0.22, 0.7)]:
        t = t_(0.28); f = 48 + 30 * np.exp(-t * 30)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * g
        a = int(t0 * SR); x[a:a + len(s)] += s
    return norm(lp(x, 400), peak)
def shutter(peak=0.5):
    d = 0.18; t = t_(d)
    x = bp(noise(d), 800, 7000) * np.exp(-t * 45) + bp(noise(d), 300, 1200) * np.exp(-t * 70) * 0.6
    return norm(x, peak)
def typing(d=1.6, rate=13, peak=0.3):
    x = np.zeros(int(d * SR)); t0 = 0.0
    while t0 < d - 0.05:
        t = t_(0.03); s = hp(noise(0.03), 1800) * np.exp(-t * 260) * rng.uniform(0.5, 1)
        a = int(t0 * SR); x[a:a + len(s)] += s; t0 += rng.uniform(0.6, 1.4) / rate
    return norm(x, peak)
def rec_beep(peak=0.35):
    d = 0.25; t = t_(d); x = np.sin(2 * np.pi * 880 * t) * env_ad(d, 0.01, 8)
    return norm(x, peak)
def listen(d=1.2, peak=0.3):
    t = t_(d)
    x = (np.sin(2 * np.pi * 440 * t) + 0.5 * np.sin(2 * np.pi * 660 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.3)
    return norm(lp(x, 2000), peak)
def reward(peak=0.55):
    notes = [1108.7, 1318.5, 1760.0, 2217.5]; d = 1.3; x = np.zeros(int(d * SR))
    for i, f in enumerate(notes):
        t = t_(0.6); s = np.sign(np.sin(2 * np.pi * f * t)) * 0.25 + np.sin(2 * np.pi * f * t)
        s = lp(s, 6000) * np.exp(-t * 7)
        a = int(i * 0.065 * SR); x[a:a + len(s)] += s
    return norm(reverb(x, 1.0, 0.3), peak)
def room(d=12.0, peak=0.25):
    """Bruit d'usine : grondement grave + ronronnement 60 Hz + chocs lointains."""
    t = t_(d)
    br = np.cumsum(noise(d)); br = hp(br, 20); br = lp(br, 180)
    hum = sum(np.sin(2 * np.pi * 60 * k * t) / k for k in (1, 2, 3)) * 0.05
    air = lp(hp(noise(d), 400), 2500) * 0.08
    x = norm(br, 1) * 0.6 + hum + air
    for _ in range(int(d * 0.8)):
        t0 = rng.uniform(0, d - 0.5); tt = t_(0.4)
        clank = bp(noise(0.4), rng.uniform(600, 1600), 4000) * np.exp(-tt * 18) * rng.uniform(0.05, 0.15)
        a = int(t0 * SR); x[a:a + len(clank)] += clank
    x = reverb(x, 1.8, 0.35, 3000)[: len(t)]
    return norm(x, peak)
def spindle(d=2.4, peak=0.4):
    t = t_(d)
    whine = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * a for f, a in ((1830, 1), (3660, 0.4), (915, 0.3)))
    whine *= 0.8 + 0.2 * np.sin(2 * np.pi * 9 * t)
    chips = bp(noise(d), 1500, 9000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 14 * t)))
    x = whine * 0.25 + chips * 0.5
    x *= np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.15)
    return norm(x, peak)
def sparks(d=1.8, peak=0.45):
    x = hp(noise(d), 2500) * 0.08
    for _ in range(int(d * 180)):
        t0 = rng.uniform(0, d - 0.02); tt = t_(0.012)
        s = hp(noise(0.012), 3000) * np.exp(-tt * 700) * rng.uniform(0.2, 1)
        a = int(t0 * SR); x[a:a + len(s)] += s
    hiss = bp(noise(d), 3500, 12000) * 0.2
    y = (x + hiss) * np.minimum(1, t_(d) / 0.05)
    return norm(y, peak)
def alarm(d=2.4, peak=0.3):
    t = t_(d)
    gate = (np.sin(2 * np.pi * 1.25 * t) > 0).astype(float)
    gate = lp(gate, 30)
    x = (np.sin(2 * np.pi * 523 * t) + 0.4 * np.sin(2 * np.pi * 1046 * t)) * gate
    return norm(lp(x, 2500), peak)


if __name__ == '__main__':
    save('whoosh_court', whoosh(0.45, 400, 3800))
    save('whoosh_long', whoosh(0.9, 250, 3000, a=0.7))
    save('whoosh_plongee', whoosh(0.7, 180, 5200, -0.1, 0.1, peak=0.8, a=0.85))
    save('whoosh_inverse', whoosh(0.5, 3500, 300, 0.5, -0.5, a=0.3))
    save('tap', tap())
    save('pop', pop())
    save('pop_haut', pop(f0=780, f1=1400))
    save('tick', tick())
    save('chime', chime())
    save('succes', chime((1108.7, 1318.5, 1760.0, 2217.5), d=1.8, peak=0.55, spread=0.07))
    save('sparkle', sparkle())
    save('impact', impact())
    save('impact_moyen', impact(0.8, 1.8))
    save('riser', riser(2.4))
    save('battement', heartbeat())
    save('shutter', shutter())
    save('frappe', typing(1.6))
    save('frappe_long', typing(2.2, 15))
    save('rec', rec_beep())
    save('ecoute', listen())
    save('recompense', reward())
    save('usine', room(14.0))
    save('broche', spindle(2.2))
    save('etincelles', sparks(1.7))
    save('alarme', alarm(2.6))
