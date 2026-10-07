#!/usr/bin/env python3
"""
Sound design per "Coach Riky — Ti alleni da mesi ma non cambi?" (44 s).

Tutto sintetizzato con numpy (nessun campione esterno, nessuna licenza da gestire):
  - bed musicale a 120 BPM con sezioni che seguono il montaggio (tensione → groove → vuoto → ripartenza → uplift → chiusura)
  - SFX sincronizzati ai tempi delle animazioni (vedi CUES): whoosh di transizione, thud, tick calendario, clank dei dischi,
    flatline ECG, pennarello, note "marimba" della scalinata, chime della timeline, ecc.

I tempi qui sotto corrispondono 1:1 a quelli costanti in src/scenes/*.tsx e src/Video11.tsx.
Uscita: public/soundtrack.wav (stereo 44.1 kHz, normalizzata a ~ -14 LUFS con ffmpeg se disponibile).
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
DUR = 44.0
TOTAL = int((DUR + 1.5) * SR)
rng = np.random.default_rng(11)


# ----------------------------------------------------------------------------- DSP di base
def fftconv(x, k):
    n = len(x) + len(k) - 1
    N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(k, N), N)[:n]


def lp(x, fc):
    fc = min(fc, SR * 0.45)
    a = 1 - math.exp(-2 * math.pi * fc / SR)
    klen = int(min(len(x), max(32, 9 / a)))
    k = a * (1 - a) ** np.arange(klen)
    return fftconv(x, k)[: len(x)]


def hp(x, fc):
    return x - lp(x, fc)


def bp(x, lo, hi):
    return lp(hp(x, lo), hi)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def fade(x, a=0.003, r=0.01):
    n = len(x)
    na, nr = int(a * SR), int(r * SR)
    if na > 0:
        x[: min(na, n)] *= np.linspace(0, 1, min(na, n))
    if nr > 0:
        x[-min(nr, n):] *= np.linspace(1, 0, min(nr, n))
    return x


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


# ----------------------------------------------------------------------------- SFX
def whoosh(d=0.55, f0=500, f1=5000, peak=0.55, tilt=1.0):
    """Rumore filtrato con centro che scorre da f0 a f1; inviluppo con picco a 'peak'."""
    n = noise(d)
    N = len(n)
    nb = 20
    out = np.zeros(N)
    u = np.linspace(0, 1, N)
    for k in range(nb):
        c = k / (nb - 1)
        f = f0 * (f1 / f0) ** c
        band = bp(n, max(60, f * 0.45), f * 1.7)
        w = np.exp(-0.5 * ((u - c) / (1.2 / nb)) ** 2)
        out += band * w
    env = np.where(u < peak, (u / peak) ** (1.6 * tilt), ((1 - u) / (1 - peak)) ** 1.3)
    return norm(fade(out * env, 0.01, 0.03), 0.9)


def impact(d=1.1, pitch=52, boom=0.9):
    t = tt(d)
    f = pitch * (1 + 2.6 * np.exp(-t / 0.07))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.34)
    tail = lp(noise(d), 160) * np.exp(-t / 0.55) * 7.0 * boom
    click = hp(noise(d), 1800) * np.exp(-t / 0.006) * 0.5
    crack = bp(noise(d), 600, 3500) * np.exp(-t / 0.05) * 0.5
    return norm(fade(body + tail + click + crack, 0.0005, 0.08), 0.95)


def thud(d=0.3, pitch=95):
    t = tt(d)
    f = pitch * (1 + 1.6 * np.exp(-t / 0.035))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(fade(np.sin(ph) * np.exp(-t / 0.09) + lp(noise(d), 400) * np.exp(-t / 0.03) * 2, 0.0005, 0.03), 0.9)


def pop(f=620, d=0.14, drop=0.7):
    t = tt(d)
    fr = f * (1 + drop * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return norm(fade(np.sin(ph) * np.exp(-t / 0.045), 0.001, 0.02), 0.9)


def bloop(f0=260, f1=720, d=0.22):
    t = tt(d)
    fr = f0 + (f1 - f0) * (t / d) ** 0.6
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return norm(fade(np.sin(ph) * np.exp(-t / 0.12), 0.002, 0.03), 0.8)


def tick(f=1900, d=0.05):
    t = tt(d)
    x = hp(noise(d), 2500) * np.exp(-t / 0.004) + np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) * 0.8
    return norm(fade(x, 0.0003, 0.01), 0.8)


def clank(base=1.0, d=0.6):
    t = tt(d)
    fr = [310, 740, 1270, 2130, 3310]
    am = [1, .8, .6, .4, .25]
    dc = [.22, .17, .12, .09, .06]
    x = sum(a * np.sin(2 * np.pi * f * base * t) * np.exp(-t / tau) for f, a, tau in zip(fr, am, dc))
    x += hp(noise(d), 3000) * np.exp(-t / 0.004) * 1.2
    x += np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.06) * 1.2
    return norm(fade(x, 0.0005, 0.05), 0.9)


def flip(d=0.32):
    t = tt(d)
    n = noise(d)
    env = (np.exp(-t / 0.07) + 0.7 * np.exp(-np.maximum(t - 0.1, 0) / 0.05) * (t > 0.1)) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 55 * t)))
    return norm(fade(bp(n, 1500, 7000) * env, 0.001, 0.05), 0.8)


def scribble(d=1.9):
    out = np.zeros(int(d * SR))
    t = 0.0
    while t < d:
        L = float(rng.uniform(0.05, 0.12))
        seg = bp(noise(L), float(rng.uniform(1800, 3200)), float(rng.uniform(5500, 8500)))
        seg *= np.hanning(len(seg)) * float(rng.uniform(0.5, 1.0))
        i = int(t * SR)
        out[i:i + len(seg)] += seg[: len(out) - i]
        t += L * 0.95
    return norm(fade(out, 0.01, 0.05), 0.55)


def chime(f=880, d=1.3):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / d) +
         0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (d * 0.5)) +
         0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / (d * 0.25)))
    return norm(fade(x, 0.002, 0.1), 0.85)


def beep(f=1000, d=0.11):
    t = tt(d)
    return norm(fade(np.sin(2 * np.pi * f * t), 0.004, 0.01), 0.55)


def flatline(d=1.4, f=1000):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(2 * np.pi * 2 * f * t)
    env = np.ones_like(t)
    env[-int(0.25 * SR):] = np.linspace(1, 0, int(0.25 * SR))
    return norm(fade(x * env, 0.01, 0.02), 0.4)


def riser(d=1.2, f0=250, f1=4500):
    n = noise(d)
    N = len(n)
    u = np.linspace(0, 1, N)
    nb = 24
    out = np.zeros(N)
    for k in range(nb):
        c = k / (nb - 1)
        f = f0 * (f1 / f0) ** c
        band = bp(n, f * 0.5, f * 1.6)
        w = np.exp(-0.5 * ((u - c) / (1.2 / nb)) ** 2)
        out += band * w
    sweep = np.sin(2 * np.pi * np.cumsum(120 * (14 ** u)) / SR) * 0.4
    env = u ** 2.2
    return norm(fade((out * 0.9 + sweep) * env, 0.01, 0.005), 0.8)


def marimba(f=523.25, d=0.7):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28) +
         0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.07) +
         0.08 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.03))
    return norm(fade(x, 0.002, 0.08), 0.85)


def deflate(d=0.7):
    t = tt(d)
    fr = 520 * np.exp(-t * 2.2) + 110
    ph = 2 * np.pi * np.cumsum(fr * (1 + 0.02 * np.sin(2 * np.pi * 7 * t))) / SR
    return norm(fade(np.sin(ph) * np.exp(-t / 0.5), 0.005, 0.1), 0.5)


def stamp():
    d = 0.9
    t = tt(d)
    slap = bp(noise(d), 700, 3500) * np.exp(-t / 0.05) * 1.1
    return norm(impact(d, 58, 0.7) * 0.9 + np.pad(slap, (0, 0))[: int(d * SR)] * 0.7, 0.95)


def sparkle(f=1046.5, n=5, gap=0.055):
    seq = [1, 1.25, 1.5, 2, 2.5][:n]
    d = 1.0 + gap * n
    out = np.zeros(int(d * SR))
    for i, m in enumerate(seq):
        c = chime(f * m, 0.9) * (0.9 - 0.1 * i)
        j = int(i * gap * SR)
        out[j:j + len(c)] += c[: len(out) - j]
    return norm(out, 0.8)


def swoosh_short(d=0.3, f0=900, f1=6000):
    return whoosh(d, f0, f1, 0.5)


def soft_tick(f=1200):
    t = tt(0.04)
    return norm(fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + hp(noise(0.04), 3000) * np.exp(-t / 0.003), 0.0003, 0.01), 0.35)


def party():
    d = 0.9
    t = tt(d)
    pop_ = hp(noise(d), 800) * np.exp(-t / 0.02) * 1.5
    shimmer = bp(noise(d), 4000, 9000) * np.exp(-t / 0.35) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t))
    return norm(fade(pop_ + shimmer, 0.0005, 0.1), 0.8)


# ----------------------------------------------------------------------------- Mixer
class Bus:
    def __init__(self):
        self.L = np.zeros(TOTAL)
        self.R = np.zeros(TOTAL)

    def add(self, sig, t, vol=1.0, pan=0.0):
        i = int(round(t * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        n = min(len(sig), TOTAL - i)
        if n <= 0:
            return
        if np.isscalar(pan):
            gl = math.cos((pan + 1) * math.pi / 4)
            gr = math.sin((pan + 1) * math.pi / 4)
            self.L[i:i + n] += sig[:n] * vol * gl
            self.R[i:i + n] += sig[:n] * vol * gr
        else:  # pan automatico (array lunga come sig)
            p = pan[:n]
            self.L[i:i + n] += sig[:n] * vol * np.cos((p + 1) * math.pi / 4)
            self.R[i:i + n] += sig[:n] * vol * np.sin((p + 1) * math.pi / 4)


def reverb_ir(d=0.9):
    t = tt(d)
    ir = noise(d) * np.exp(-t / 0.22)
    ir = lp(ir, 5000)
    ir[0] = 0
    return ir / np.sqrt(np.sum(ir ** 2))


# ----------------------------------------------------------------------------- Timeline (secondi assoluti)
TRANS = [  # (t, tipo)
    (4.0, 'wipeR'), (6.5, 'stripes'), (9.0, 'iris'), (11.5, 'wipeU'), (14.0, 'wipeL'), (16.5, 'stripes'),
    (19.0, 'iris'), (22.0, 'wipeR'), (25.0, 'wipeU'), (26.4, 'wipeR'), (27.8, 'wipeL'), (29.2, 'wipeR'),
    (30.6, 'wipeL'), (32.0, 'stripes'), (35.5, 'wipeL'), (39.0, 'iris'), (41.5, 'wipeR'),
]
SHORT = {26.4, 27.8, 29.2, 30.6}


def eio3_inv(y):
    return (y / 4) ** (1 / 3) if y < 0.5 else 1 - (2 * (1 - y)) ** (1 / 3) / 2


def build_sfx():
    S = Bus()
    # --- transizioni
    for t, kind in TRANS:
        short = t in SHORT
        d = 0.36 if short else 0.58
        if kind in ('wipeR', 'wipeL'):
            w = whoosh(d, 600, 5200, 0.55)
            sgn = 1 if kind == 'wipeR' else -1
            pan = np.linspace(-0.75 * sgn, 0.75 * sgn, len(w))
            S.add(w, t - d * 0.55, 0.75, pan)
        elif kind == 'wipeU':
            S.add(whoosh(d, 350, 7000, 0.6), t - d * 0.6, 0.75)
        elif kind == 'stripes':
            S.add(whoosh(d, 800, 4200, 0.5), t - d * 0.5, 0.6)
            for i in range(6):
                S.add(tick(1500 + 220 * i), t - 0.16 + i * 0.05, 0.5, -0.6 + i * 0.24)
        else:  # iris: risucchio + pop
            S.add(whoosh(d, 5200, 500, 0.45), t - d * 0.7, 0.7)
            S.add(pop(300, 0.25, 1.6), t - 0.02, 0.9)
        S.add(thud(0.3, 85), t, 0.55 if not short else 0.4)

    # --- S1 (0–4): hook
    S.add(thud(0.4, 70), 0.40, 0.9)                              # calendario atterra
    for i in range(7):
        S.add(tick(1700 + 90 * i), 0.5 + i * 0.1, 0.6, -0.3)     # stamp Gennaio
    S.add(flip(), 1.2, 0.8, 0.0)
    for i in range(6):
        S.add(tick(1900 + 90 * i), 1.55 + i * 0.08, 0.6, -0.3)   # stamp Febbraio
    S.add(flip(), 2.0, 0.8, 0.0)
    for i in range(7):
        S.add(tick(2100 + 90 * i), 2.4 + i * 0.1, 0.6, -0.3)     # stamp Marzo
    for tw, f in zip([0.25, 0.5, 0.85, 1.05], [560, 640, 720, 850]):
        S.add(pop(f), tw, 0.6)                                    # parole hook
    S.add(riser(1.15), 1.45, 0.8)                                 # tensione verso "MA NON CAMBI?"
    S.add(whoosh(0.4, 300, 2500, 0.6), 1.95, 0.6, 0.5)            # Riky entra
    S.add(bloop(240, 640), 2.35, 0.6, 0.5)
    S.add(impact(0.8, 56), 2.6, 0.7)                              # MA
    S.add(pop(300, 0.2), 2.85, 0.8)                               # NON
    S.add(impact(1.3, 46, 1.2), 3.1, 1.0)                         # CAMBI?
    S.add(bloop(500, 220, 0.3), 3.12, 0.6, 0.5)                   # "?" vibra

    # --- S2a (4–9): palestra
    S.add(whoosh(0.3, 700, 3600, 0.5), 4.2, 0.5, -0.5)
    S.add(pop(520), 4.22, 0.6, -0.5)
    S.add(pop(700), 4.32, 0.6, 0.5)
    for k, tp in enumerate([4.75, 5.95]):
        S.add(clank(1.0), tp, 0.85)
        S.add(chime(1320, 0.4), tp + 0.02, 0.35, 0.4)             # contatore rep
        S.add(thud(0.25, 110), tp + 0.6, 0.55)                    # bilanciere in basso
    # --- S2b: card uguali
    S.add(whoosh(0.4, 400, 2500, 0.5), 6.55, 0.5, -0.6)
    for tc in (6.7, 7.4, 8.1):
        S.add(whoosh(0.35, 1500, 400, 0.6), tc - 0.05, 0.55, 0.5)
        S.add(pop(430, 0.18), tc + 0.25, 0.8, 0.3)
    S.add(pop(900, 0.1), 7.0, 0.4, 0.2)
    S.add(pop(900, 0.1), 7.7, 0.4, 0.2)
    for i in range(20):                                           # orologio accelerato
        S.add(soft_tick(1000 if i % 2 else 1400), 6.6 + i * 0.1, 0.5, 0.75)
    S.add(stamp(), 8.55, 1.0)                                     # UGUALE.

    # --- S3a (9–11.5): reel dei mesi
    for i, tc in enumerate((9.05, 9.12, 9.2)):
        S.add(pop(480 + 80 * i), tc, 0.55, -0.5 + i * 0.5)
    S.add(whoosh(2.35, 200, 3200, 0.6, tilt=0.8), 9.15, 0.5)
    for k in range(1, 18):
        tk = 9.15 + eio3_inv(k / 17) * 2.35
        S.add(tick(1500 + 40 * k, 0.05), tk, 0.7, 0.0)
        S.add(pop(240, 0.06, 0.2), tk, 0.18)
    S.add(impact(0.9, 60), 11.5, 0.8)
    S.add(deflate(0.8), 11.6, 0.55)
    # --- S3b: identici
    S.add(whoosh(0.35, 500, 3000, 0.5), 11.62, 0.5, -0.6)
    S.add(pop(520), 11.72, 0.7, -0.6)
    S.add(whoosh(0.35, 500, 3000, 0.5), 12.02, 0.5, 0.6)
    S.add(pop(560), 12.12, 0.7, 0.6)
    S.add(bloop(300, 800, 0.2), 12.55, 0.8)
    S.add(stamp(), 13.1, 1.0)
    S.add(deflate(0.9), 13.25, 0.7)

    # --- S4a (14–16.5): STESSO ...
    for tl in (14.15, 15.0, 15.85):
        S.add(whoosh(0.3, 500, 4500, 0.7), tl - 0.15, 0.7)
        S.add(impact(0.9, 50, 1.0), tl + 0.1, 0.95)
    # --- S4b: ECG + flatline
    for tb in (16.75, 17.15, 17.55):
        S.add(beep(1000), tb, 0.6)
    S.add(bloop(300, 700, 0.2), 17.3, 0.5)
    S.add(flatline(1.25), 17.78, 0.55)
    S.add(stamp(), 17.8, 0.9)

    # --- S5a (19–22): Riky scrive
    S.add(whoosh(0.5, 300, 2800, 0.5), 19.05, 0.55, -0.6)
    S.add(bloop(240, 640), 19.45, 0.5, -0.4)
    S.add(chime(1568, 0.6), 19.35, 0.35, 0.3)                     # vetro
    S.add(scribble(1.85), 19.85, 0.75, 0.2)
    S.add(whoosh(0.3, 1200, 5000, 0.4), 21.95, 0.6)               # sottolineatura
    # --- S5b: scalinata
    pent = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26]
    for i, s in enumerate(pent):
        f = 261.63 * 2 ** (s / 12)
        S.add(marimba(f), 22.1 + i * 0.12, 0.75, -0.6 + i * 0.1)
        S.add(thud(0.15, 120), 22.1 + i * 0.12 + 0.12, 0.2)       # salto di Riky
    S.add(sparkle(1046.5), 23.74, 0.7)

    # --- S6 (25–32): montaggio
    S.add(impact(0.7, 58), 25.25, 0.8)
    S.add(clank(0.85), 25.58, 0.9)
    S.add(clank(0.95), 25.98, 0.9)
    S.add(pop(700, 0.2), 26.02, 0.8)
    S.add(impact(0.6, 60), 26.65, 0.6)
    for i in range(4):
        S.add(tick(1500 + 200 * i), 26.65 + i * 0.2, 0.8)
        S.add(chime(660 * 2 ** (i * 2 / 12), 0.4), 26.65 + i * 0.2, 0.35)
    S.add(impact(0.6, 60), 28.02, 0.6)
    for i, tc in enumerate((28.2, 28.5, 28.8)):
        S.add(pop(600 * 2 ** (i * 4 / 12)), tc, 0.7, 0.4)
        S.add(chime(880 * 2 ** (i * 4 / 12), 0.5), tc + 0.03, 0.4, 0.4)
    S.add(whoosh(0.7, 900, 3000, 0.5), 27.9, 0.35, 0.3)           # scansione
    S.add(impact(0.6, 62), 29.42, 0.6)
    for i in range(5):
        S.add(marimba(329.63 * 2 ** (i * 3 / 12), 0.5), 29.4 + i * 0.16, 0.7, -0.4 + i * 0.2)
    S.add(pop(900, 0.2), 30.1, 0.7)
    S.add(impact(0.6, 56), 30.82, 0.6)
    S.add(whoosh(1.05, 300, 1500, 0.6), 30.75, 0.35)              # anello recupero
    for i, f in enumerate((660, 523, 392)):
        S.add(chime(f, 0.9), 30.95 + i * 0.3, 0.3, 0.5)
    S.add(chime(1046.5, 1.2), 31.8, 0.5)

    # --- S7 (32–39): timeline
    for tn, f in zip((32.5, 34.0, 36.0, 37.5), (523.25, 659.25, 783.99, 1046.5)):
        S.add(pop(f * 0.6, 0.18), tn, 0.8)
        S.add(chime(f, 1.0), tn + 0.02, 0.5)
    for a, b in ((32.6, 34.0), (34.1, 36.0), (36.1, 37.5)):
        S.add(whoosh(b - a, 400, 2400, 0.7), a, 0.3, 0.0)
    S.add(party(), 37.55, 0.8)
    S.add(sparkle(1318.5), 37.6, 0.7)
    S.add(impact(0.9, 58), 37.9, 0.85)
    S.add(sparkle(1046.5, 4), 37.95, 0.6)

    # --- S8 (39–44): chiusura
    for tw, f in zip([39.25, 39.5, 39.78, 40.05, 40.35, 40.95], [420, 470, 520, 560, 620, 680]):
        S.add(pop(f, 0.12), tw, 0.65)
        S.add(tick(1800), tw, 0.5)
    S.add(riser(0.95, 300, 5000), 40.35, 0.9)
    S.add(impact(1.5, 44, 1.3), 41.3, 1.0)                        # "BENE."
    S.add(bloop(240, 700), 41.68, 0.7)
    S.add(impact(0.9, 55), 41.88, 0.85)                           # logo
    S.add(sparkle(1046.5, 5), 42.0, 0.8)
    S.add(pop(700, 0.14), 42.3, 0.7)
    S.add(pop(800, 0.14), 42.75, 0.7)
    S.add(chime(523.25, 2.2), 42.0, 0.35)

    # riverbero leggero
    ir = reverb_ir()
    wetL = fftconv(S.L, ir)[:TOTAL]
    wetR = fftconv(S.R, np.roll(ir, 211))[:TOTAL]
    S.L += wetL * 0.16
    S.R += wetR * 0.16
    return S


# ----------------------------------------------------------------------------- Musica
CH = {
    'Am': (110.00, [220.00, 261.63, 329.63, 440.00]),
    'F': (87.31, [174.61, 220.00, 261.63, 349.23]),
    'C': (130.81, [261.63, 329.63, 392.00, 523.25]),
    'G': (98.00, [196.00, 246.94, 293.66, 392.00]),
}
CHORDS = [(0, 'Am'), (2, 'F'), (4, 'C'), (6, 'G'), (8, 'Am'), (10, 'F'), (12, 'C'), (14, 'Am'), (19, 'C'), (21, 'G'), (23, 'Am'),
          (25, 'F'), (27, 'C'), (29, 'G'), (31, 'Am'), (32, 'C'), (34, 'G'), (36, 'Am'), (38, 'F'), (39, 'F'), (41.5, 'C')]


def chord_at(t):
    c = CHORDS[0][1]
    for ct, nm in CHORDS:
        if t >= ct - 1e-9:
            c = nm
    return c


def k_kick(d=0.4):
    t = tt(d)
    f = 48 + 110 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade(np.sin(ph) * np.exp(-t / 0.2) + hp(noise(d), 2000) * np.exp(-t / 0.004) * 0.4, 0.0005, 0.05)


def k_clap(d=0.3):
    t = tt(d)
    x = np.zeros(len(t))
    for off in (0, 0.011, 0.023):
        i = int(off * SR)
        m = len(t) - i
        seg = bp(rng.standard_normal(m), 900, 3200) * np.exp(-t[:m] / 0.012)
        x[i:i + len(seg)] += seg
    x += bp(noise(d), 700, 2800) * np.exp(-np.maximum(t - 0.03, 0) / 0.09) * (t > 0.03) * 0.5
    return fade(norm(x, 1.0), 0.0005, 0.05)


def k_hat(open_=False):
    d = 0.18 if open_ else 0.05
    t = tt(d)
    return fade(hp(noise(d), 7000) * np.exp(-t / (0.07 if open_ else 0.012)), 0.0003, 0.01)


def k_snare(d=0.2):
    t = tt(d)
    return fade(bp(noise(d), 1200, 6000) * np.exp(-t / 0.05) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.4, 0.0005, 0.03)


def k_bass(f, d):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(t / 0.006, 1) * np.exp(-t / (d * 0.9))
    return x * env


def k_pluck(f, d=0.28, bright=1.0):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** (1.0 + 0.4 / bright) for k in range(1, 7))
    return fade(x * np.exp(-t / 0.13) * np.minimum(t / 0.003, 1), 0.001, 0.03)


def k_pad(freqs, d):
    t = tt(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0.004):
            ff = f * (1 + det)
            x += sum(np.sin(2 * np.pi * ff * k * t + det * 50) / k ** 1.6 for k in range(1, 7))
    return x / (len(freqs) * 2)


def automation(pts, n=TOTAL):
    xs = [p[0] * SR for p in pts]
    ys = [p[1] for p in pts]
    return np.interp(np.arange(n), xs, ys)


def build_music():
    drums = Bus()
    harm = Bus()  # bass + pad + arp (soggetti a sidechain)
    kicks = []
    kick, clap, hat, ohat, snare = k_kick(), k_clap(), k_hat(), k_hat(True), k_snare()

    def sec(t):
        if t < 4: return 'A'
        if t < 14: return 'B'
        if t < 19: return 'C'
        if t < 25: return 'D'
        if t < 32: return 'E'
        if t < 39: return 'F'
        if t < 41.5: return 'G'
        return 'H'

    step = 0.25
    i = 0
    while i * step < DUR + 0.01:
        t = i * step
        s = sec(t)
        bi = int(round(t / 0.5))
        on_beat = abs(t / 0.5 - round(t / 0.5)) < 1e-6
        beat_in_bar = bi % 4
        ch = chord_at(t)
        root, tones = CH[ch]
        # --- drum
        if on_beat:
            if s == 'A' and beat_in_bar in (0, 2):
                drums.add(kick, t, 0.55); kicks.append(t)
            elif s == 'B':
                drums.add(kick, t, 0.9); kicks.append(t)
                if beat_in_bar in (1, 3):
                    drums.add(clap, t, 0.55, 0.1)
            elif s == 'D' and t >= 19.0:
                drums.add(kick, t, 0.8); kicks.append(t)
                if t >= 22 and beat_in_bar in (1, 3):
                    drums.add(clap, t, 0.5, 0.1)
            elif s in ('E', 'F'):
                drums.add(kick, t, 0.95); kicks.append(t)
                if beat_in_bar in (1, 3):
                    drums.add(clap, t, 0.6, 0.1)
            elif s == 'G' and beat_in_bar == 0:
                drums.add(kick, t, 0.6); kicks.append(t)
            elif s == 'H' and abs(t - 41.5) < 1e-6:
                drums.add(kick, t, 1.0); kicks.append(t)
        # hats
        if s == 'A' and not on_beat:
            drums.add(hat, t, 0.22, 0.3)
        if s == 'B':
            drums.add(hat, t, 0.30 if not on_beat else 0.14, 0.3)
        if s == 'D' and t >= 22:
            drums.add(hat, t, 0.26 if not on_beat else 0.12, 0.3)
        if s in ('E', 'F'):
            drums.add(ohat if (not on_beat and i % 4 == 3) else hat, t, 0.28 if not on_beat else 0.14, 0.3)
        if s == 'G':
            drums.add(hat, t, 0.18, 0.3)
        # --- basso
        if s == 'A' and on_beat and beat_in_bar == 0:
            harm.add(k_bass(root, 1.9), t, 0.55)
        if s in ('B', 'E', 'F'):
            f = root * (2 if (i % 4 == 3) else 1)
            if i % 2 == 0 or s != 'B':
                harm.add(k_bass(f, 0.24), t, 0.62)
        if s == 'C' and abs((t % 2)) < 1e-6:
            harm.add(k_bass(root / 2, 1.95), t, 0.6)
        if s == 'D' and t >= 22 and on_beat:
            harm.add(k_bass(root, 0.45), t, 0.6)
        if s == 'H' and abs(t - 41.5) < 1e-6:
            harm.add(k_bass(root, 2.5), t, 0.7)
        # --- arpeggio / pluck
        order = [0, 1, 2, 3, 2, 1, 2, 3]
        if s == 'D' and t >= 19.5:
            harm.add(k_pluck(tones[order[i % 8]], 0.3), t, 0.30, -0.3 + 0.1 * (i % 5))
        if s == 'E':
            harm.add(k_pluck(tones[order[i % 8]] * 2, 0.22, 1.5), t, 0.26, -0.4 + 0.2 * (i % 4))
            if not on_beat:
                harm.add(k_pluck(tones[1], 0.18, 0.8) + k_pluck(tones[2], 0.18, 0.8), t, 0.14, 0.3)
        if s == 'F':
            harm.add(k_pluck(tones[order[i % 8]] * 2, 0.35, 2.0), t, 0.30, -0.5 + 0.25 * (i % 5))
            if i % 2 == 1:
                harm.add(k_pluck(tones[0] * 4, 0.25, 2.0), t, 0.12, 0.5)
        if s == 'H' and abs(t - 41.5) < 1e-6:
            for q, f in enumerate(CH['C'][1] + [659.25, 783.99]):
                harm.add(k_pluck(f, 0.9, 2.0), t + q * 0.03, 0.28, -0.5 + 0.2 * q)
        i += 1

    # rullo di rullante + piatto prima dei cut principali
    for start, end in ((34.9, 35.5), (38.3, 39.0)):
        n = int((end - start) / 0.0625)
        for j in range(n):
            tj = start + j * (end - start) / n
            drums.add(snare, tj, 0.25 + 0.5 * j / n)
    for tc in (3.9, 13.9, 18.9, 24.9, 31.9):
        drums.add(snare, tc - 0.4, 0.3); drums.add(snare, tc - 0.2, 0.4)

    # --- pad continuo per ogni accordo
    pad = Bus()
    gains = automation([(0, 0.0), (0.4, 0.55), (4, 0.5), (14, 0.45), (14.1, 0.62), (19, 0.62), (19.1, 0.5), (25, 0.45), (32, 0.66), (39, 0.7), (41.5, 0.85), (43.0, 0.8), (44.0, 0.0)])
    padL = np.zeros(TOTAL); padR = np.zeros(TOTAL)
    for idx, (ct, nm) in enumerate(CHORDS):
        nxt = CHORDS[idx + 1][0] if idx + 1 < len(CHORDS) else DUR + 1.0
        if nxt <= ct:
            continue
        d = nxt - ct + 0.5
        sig = k_pad(CH[nm][1][:3], d)
        # attacco/rilascio morbido
        a = np.minimum(tt(d) / 0.35, 1.0)
        r = np.minimum((d - tt(d)) / 0.5, 1.0)
        sig = sig * a * r
        i0 = int(ct * SR)
        n = min(len(sig), TOTAL - i0)
        padL[i0:i0 + n] += sig[:n] * 0.9
        padR[i0:i0 + n] += sig[:n] * 1.0
    # lowpass dinamico nel breakdown (14-19): più cupo
    padL_f = lp(padL, 1100); padR_f = lp(padR, 1100)
    mixw = automation([(0, 0.0), (13.5, 0.0), (14.0, 1.0), (18.6, 1.0), (19.0, 0.0), (44, 0.0)])
    padL = padL * (1 - mixw) + padL_f * mixw
    padR = padR * (1 - mixw) + padR_f * mixw
    padL *= gains * 0.55
    padR *= gains * 0.55

    # sidechain
    duck = np.ones(TOTAL)
    for tk in kicks:
        i0 = int(tk * SR)
        n = int(0.28 * SR)
        e = 1 - 0.5 * np.exp(-np.arange(n) / (0.1 * SR))
        seg = duck[i0:i0 + n]
        duck[i0:i0 + len(seg)] = np.minimum(seg, e[: len(seg)])
    L = drums.L + (harm.L + padL) * duck
    R = drums.R + (harm.R + padR) * duck

    # fade finale e taglio sotto i 35 Hz
    fo = automation([(0, 1.0), (43.0, 1.0), (44.3, 0.0)])
    return L * fo, R * fo


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'soundtrack.wav')
    S = build_sfx()
    mL, mR = build_music()
    mL = hp(mL, 35); mR = hp(mR, 35)
    mus_gain = 0.42
    L = S.L * 0.9 + mL * mus_gain
    R = S.R * 0.9 + mR * mus_gain
    # soft clip
    L = np.tanh(L * 0.9); R = np.tanh(R * 0.9)
    peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
    L /= peak; R /= peak
    pcm = np.stack([L, R], axis=1)
    pcm = (pcm * 0.89 * 32767).astype('<i2')
    raw = out + '.raw.wav'
    with wave.open(raw, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    # loudness ~ -14 LUFS (standard social) con ffmpeg
    try:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9',
                        '-ar', str(SR), '-ac', '2', '-t', f'{DUR + 0.5}', out], check=True)
        os.remove(raw)
    except Exception as e:  # pragma: no cover
        print('loudnorm non disponibile:', e)
        os.replace(raw, out)
    print('scritto', os.path.abspath(out))


if __name__ == '__main__':
    main()
