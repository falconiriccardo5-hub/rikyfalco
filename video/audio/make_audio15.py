#!/usr/bin/env python3
"""
Sound design — Video 15 «Analizzo una scheda tipo» (verticale, ~60 s).

Riusa i sintetizzatori di make_audio.py. Tempi: tutto è derivato da src/voice12_timing.json (stesse formule di
src/v12/Video12.tsx), così effetti e musica cadono sulle parole e sui cambi scena.
Musica: tesa/minore sulle scene "errore", luminosa/maggiore sulle "correzione".
Uscita: public/soundtrack12.wav (stereo, ~ -14 LUFS).
"""
import json
import math
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_audio as M  # noqa: E402

M.TOTAL = int(68 * M.SR)  # reel lungo (~60 s)
M.automation.__defaults__ = (M.TOTAL,)

SR, TOTAL = M.SR, M.TOTAL
ROOT = os.path.join(HERE, '..')
VT = {x['slot']: x for x in json.load(open(os.path.join(ROOT, 'src', 'voice15_timing.json')))}
st = lambda s: VT[s]['t0']
en = lambda s: VT[s]['t1']
wd = lambda s: VT[s]['words']

G = 0.22
SL = ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08', 'a09', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15']
END = min(64, en('a15') + 1.4)
W = {s: (0 if i == 0 else st(s) - G, END if i == len(SL) - 1 else st(SL[i + 1]) - G) for i, s in enumerate(SL)}
TT = ['iris', 'wipeR', 'wipeU', 'stripes', 'wipeL', 'iris', 'wipeR', 'stripes', 'wipeU', 'wipeL', 'wipeR', 'iris', 'wipeU', 'stripes']
TR = list(zip(SL[1:], TT))
FINAL = round((END - 1.6) * 4) / 4
KIND = {'a01': 'hook', 'a02': 'hook', 'a03': 'err', 'a04': 'err', 'a05': 'err', 'a06': 'err', 'a07': 'err', 'a08': 'demo',
        'a09': 'demo', 'a10': 'fix', 'a11': 'fix', 'a12': 'fix', 'a13': 'fix', 'a14': 'recap', 'a15': 'cta'}


def buzz(d=0.32, f=140):
    t = M.tt(d)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sin(2 * np.pi * f * 1.5 * t) * 0.4
    x *= (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 22 * t)))
    return M.norm(M.fade(M.lp(x, 1400) * np.exp(-t / 0.25), 0.003, 0.05), 0.55)


def build_sfx():
    S = M.Bus()
    for slot, kind in TR:
        t = W[slot][0]
        d = 0.58
        if kind in ('wipeR', 'wipeL'):
            w = M.whoosh(d, 600, 5200, 0.55)
            sgn = 1 if kind == 'wipeR' else -1
            S.add(w, t - d * 0.55, 0.75, np.linspace(-0.75 * sgn, 0.75 * sgn, len(w)))
        elif kind == 'wipeU':
            S.add(M.whoosh(d, 350, 7000, 0.6), t - d * 0.6, 0.75)
        elif kind == 'stripes':
            S.add(M.whoosh(d, 800, 4200, 0.5), t - d * 0.5, 0.6)
            for i in range(6):
                S.add(M.tick(1500 + 220 * i), t - 0.16 + i * 0.05, 0.5, -0.6 + i * 0.24)
        else:
            S.add(M.whoosh(d, 5200, 500, 0.45), t - d * 0.7, 0.7)
            S.add(M.pop(300, 0.25, 1.6), t - 0.02, 0.9)
        S.add(M.thud(0.3, 85), t, 0.55)

    # ---- hook
    S.add(M.whoosh(0.6, 500, 3000, 0.5), 0.05, 0.5); S.add(M.flip(), 0.2, 0.6)
    w = wd('a02')
    S.add(M.scribble(1.0), w[0], 0.35); S.add(M.pop(700), w[3], 0.6); S.add(M.tick(1800), w[5], 0.5)
    # ---- problema
    w = wd('a03')
    for k in (0, 2, 4):
        S.add(M.pop(520 + 60 * k), w[k], 0.5)
    S.add(M.stamp(), w[9], 0.7)
    w = wd('a04')
    for i in range(3):
        S.add(M.pop(600), w[3] + i * 0.25 - 0.15, 0.5)
    S.add(buzz(0.35), w[8], 0.45); S.add(M.stamp(), w[10], 0.6)
    # ---- tensione
    w = wd('a05'); S.add(M.scribble(0.9), w[4], 0.45); S.add(M.pop(400), w[8], 0.5)
    w = wd('a06'); S.add(M.scribble(0.8), w[2], 0.45); S.add(M.pop(430), w[3], 0.5)
    for i in range(5):
        S.add(M.tick(1500 + 120 * i), w[8] + i * 0.1, 0.4)
    w = wd('a07'); S.add(buzz(0.35), w[3], 0.45); S.add(M.stamp(), w[3] + 0.05, 0.6)
    # ---- valore
    w = wd('a08'); S.add(M.stamp(), W['a08'][0] + 0.1, 0.6)
    for i in range(3):
        S.add(M.pop(640 + 70 * i), w[6] + i * 0.25, 0.55)
    w = wd('a09'); S.add(M.impact(0.9, 54, 0.9), w[2], 0.7); S.add(M.sparkle(1046.5, 4), w[2], 0.5)
    w = wd('a10'); S.add(M.stamp(), W['a10'][0] + 0.1, 0.6)
    for i in range(3):
        S.add(M.pop(600 + 60 * i), w[1] + i * 0.2, 0.5)
    S.add(M.chime(988, 0.7), w[5], 0.35, 0.3)
    w = wd('a11'); S.add(M.stamp(), W['a11'][0] + 0.1, 0.6)
    for i in range(5):
        S.add(M.tick(1400 + 100 * i), w[1] + i * 0.15, 0.45)
    S.add(M.clank(1.0), w[5], 0.35)
    w = wd('a12'); S.add(M.stamp(), W['a12'][0] + 0.1, 0.6); S.add(M.scribble(0.8), w[5], 0.35); S.add(M.chime(1046.5, 0.8), w[8], 0.4, 0.3)
    w = wd('a13'); S.add(M.riser(max(0.6, w[7] - W['a13'][0] - 0.2), 300, 3000), W['a13'][0] + 0.2, 0.35); S.add(M.sparkle(1174.7, 5), w[7], 0.6)
    # ---- fiducia / CTA
    w = wd('a14'); S.add(M.impact(0.9, 54, 0.9), w[6], 0.8); S.add(M.stamp(), w[6], 0.8); S.add(M.pop(700), w[14], 0.5)
    w = wd('a15'); S.add(M.impact(0.9, 54, 0.9), w[5] - 0.1, 0.8); S.add(M.sparkle(1318.5, 6), w[6], 0.7); S.add(M.chime(523.25, 2.0), w[6], 0.35); S.add(M.pop(800), w[8], 0.6)

    ir = M.reverb_ir()
    S.L += M.fftconv(S.L, ir)[:TOTAL] * 0.14
    S.R += M.fftconv(S.R, np.roll(ir, 211))[:TOTAL] * 0.14
    return S


def sec_of(t):
    for k, (a, b) in W.items():
        if a <= t < b:
            return k
    return SL[-1]


def kind_of(sk):
    return KIND[sk]


def chord12(t, kind):
    bar = int(t // 2)
    if kind == 'hook': return 'Am'
    if kind == 'demo': return 'F' if bar % 2 == 0 else 'C'
    if kind == 'err': return 'Am' if bar % 2 == 0 else 'F'
    if kind == 'fix': return 'C' if bar % 2 == 0 else 'G'
    if kind == 'recap': return ['C', 'G', 'Am', 'F'][bar % 4]
    return 'C'


def build_music():
    drums, harm = M.Bus(), M.Bus()
    kicks = []
    kick, clap, hat, ohat, snare = M.k_kick(), M.k_clap(), M.k_hat(), M.k_hat(True), M.k_snare()
    order = [0, 1, 2, 3, 2, 1, 2, 3]
    i = 0
    while i * 0.25 < END + 0.01:
        t = i * 0.25
        kd = kind_of(sec_of(t))
        bi = int(round(t / 0.5))
        on_beat = abs(t / 0.5 - round(t / 0.5)) < 1e-6
        bib = bi % 4
        root, tones = M.CH[chord12(t, kd)]
        final = t >= FINAL - 1e-6
        if not final:
            if on_beat:
                if kd == 'err' and bib in (0, 2):
                    drums.add(kick, t, 0.95); kicks.append(t)
                elif kd in ('hook', 'demo', 'fix', 'recap'):
                    drums.add(kick, t, 0.9); kicks.append(t)
                    if bib in (1, 3) and (kd != 'hook' or t > 0.3):
                        drums.add(clap, t, 0.55, 0.1)
                elif kd == 'cta' and bib in (0, 2):
                    drums.add(kick, t, 0.8); kicks.append(t)
            if kd in ('hook', 'demo', 'fix', 'recap'):
                drums.add(hat, t, 0.3 if not on_beat else 0.14, 0.3)
            if kd == 'recap' and not on_beat:
                drums.add(ohat if i % 4 == 3 else hat, t, 0.2, 0.3)
            if kd == 'err' and not on_beat and i % 2 == 1:
                drums.add(hat, t, 0.16, 0.3)
            # basso
            if kd == 'err' and on_beat:
                harm.add(M.k_bass(root / (2 if bib in (1, 3) else 1), 0.45), t, 0.7)
            elif kd in ('hook', 'demo', 'fix', 'recap'):
                f = root * (2 if (i % 4 == 3) else 1)
                harm.add(M.k_bass(f, 0.24), t, 0.62)
            elif kd == 'cta' and on_beat and bib == 0:
                harm.add(M.k_bass(root, 1.8), t, 0.55)
            # arpeggi
            if kd == 'fix':
                harm.add(M.k_pluck(tones[order[i % 8]] * 2, 0.26, 1.6), t, 0.3, -0.4 + 0.2 * (i % 4))
            if kd == 'recap':
                harm.add(M.k_pluck(tones[order[i % 8]] * 2, 0.3, 2.0), t, 0.3, -0.5 + 0.25 * (i % 5))
            if kd == 'demo' and not on_beat and i % 2 == 1:
                harm.add(M.k_pluck(tones[2], 0.18, 0.8), t, 0.14, 0.3)
        elif abs(t - FINAL) < 1e-6:
            drums.add(kick, t, 1.0); kicks.append(t)
            harm.add(M.k_bass(M.CH['C'][0], 1.6), t, 0.7)
            for q, f in enumerate(M.CH['C'][1] + [659.25, 783.99]):
                harm.add(M.k_pluck(f, 0.9, 2.0), t + q * 0.03, 0.28, -0.5 + 0.2 * q)
        i += 1
    # rulli prima di correzione / finale
    for slot in ('a08', 'a10', 'a12', 'a14', 'a15'):
        tc = W[slot][0]
        for j in range(4):
            drums.add(snare, tc - 0.45 + j * 0.11, 0.2 + 0.12 * j)

    # pad
    gains = M.automation([(0, 0.0), (0.4, 0.5), (END - 1.5, 0.55), (END - 0.2, 0.2), (END + 0.5, 0.0)])
    padL = np.zeros(TOTAL); padR = np.zeros(TOTAL)
    t = 0.0
    segs = []
    while t < END:
        kd = kind_of(sec_of(t))
        ch = chord12(t, kd) if t < FINAL else 'C'
        nxt = min(END + 0.5, (math.floor(t / 2) + 1) * 2)
        if t >= FINAL - 1e-6:
            nxt = END + 0.6
        segs.append((t, nxt, ch, kd))
        t = nxt
    for (a, b, ch, kd) in segs:
        d = b - a + 0.5
        sig = M.k_pad(M.CH[ch][1][:3], d)
        sig *= np.minimum(M.tt(d) / 0.3, 1.0) * np.minimum((d - M.tt(d)) / 0.4, 1.0)
        i0 = int(a * SR)
        n = min(len(sig), TOTAL - i0)
        g = 0.75 if kd == 'err' else 1.0
        padL[i0:i0 + n] += sig[:n] * 0.9 * g
        padR[i0:i0 + n] += sig[:n] * g
    padL *= gains * 0.55; padR *= gains * 0.55
    duck = np.ones(TOTAL)
    for tk in kicks:
        i0 = int(tk * SR); n = int(0.28 * SR)
        e = 1 - 0.5 * np.exp(-np.arange(n) / (0.1 * SR))
        seg = duck[i0:i0 + n]
        duck[i0:i0 + len(seg)] = np.minimum(seg, e[: len(seg)])
    L = drums.L + (harm.L + padL) * duck
    R = drums.R + (harm.R + padR) * duck
    fo = M.automation([(0, 1.0), (END - 0.6, 1.0), (END + 0.5, 0.0)])
    return L * fo, R * fo


def load_voice():
    path = os.path.join(ROOT, 'public', 'voce15.wav')
    if not os.path.exists(path):
        return None
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
    v = np.zeros(TOTAL)
    v[: min(len(x), TOTAL)] = x[:TOTAL]
    return M.hp(v, 70)


def main():
    out = os.path.join(ROOT, 'public', 'soundtrack15.wav')
    S = build_sfx()
    mL, mR = build_music()
    mL = M.hp(mL, 35); mR = M.hp(mR, 35)
    vo = load_voice()
    if vo is None:
        sfx_g, mus_g, d_s, d_m, vo = 0.9, 0.42, np.ones(TOTAL), np.ones(TOTAL), np.zeros(TOTAL)
    else:
        e = M.voice_env(vo)
        sfx_g, mus_g = 0.42, 0.26
        d_s, d_m = 1 - 0.72 * e, 1 - 0.80 * e
    L = S.L * sfx_g * d_s + mL * mus_g * d_m + vo
    R = S.R * sfx_g * d_s + mR * mus_g * d_m + vo
    rest = S.L * sfx_g * d_s + mL * mus_g * d_m
    hopn = int(0.05 * SR); rr = []
    for i in range(0, TOTAL - hopn, hopn):
        v = np.sqrt((vo[i:i + hopn] ** 2).mean())
        if v > 0.03:
            rr.append(20 * np.log10(v / (np.sqrt((rest[i:i + hopn] ** 2).mean()) + 1e-9)))
    if rr:
        print(f'voce vs resto (mediana): {np.median(rr):+.1f} dB · 10° percentile: {np.percentile(rr, 10):+.1f} dB')
    L = np.tanh(L * 0.9); R = np.tanh(R * 0.9)
    pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
    pcm = (np.stack([L / pk, R / pk], axis=1) * 0.89 * 32767).astype('<i2')
    raw = out + '.raw.wav'
    with wave.open(raw, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9',
                    '-ar', str(SR), '-ac', '2', '-t', f'{END + 0.5}', out], check=True)
    os.remove(raw)
    print('scritto', os.path.abspath(out), f'(durata video {END:.2f}s)')


if __name__ == '__main__':
    main()
