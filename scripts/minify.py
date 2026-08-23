#!/usr/bin/env python3
"""Minificatore conservativo, zero dipendenze.

Una sola macchina a stati percorre il sorgente distinguendo codice,
stringhe e commenti. E' l'unico modo corretto: separare i commenti dalle
stringhe in due passate e' impossibile (un apostrofo dentro un commento
italiano — "l'altezza" — verrebbe scambiato per apertura di stringa).

CSS: rimuove commenti e spazi non significativi. Le stringhe restano
     intatte byte per byte (le data-URI SVG contengono spazi letterali).
JS : deliberatamente prudente — toglie commenti e indentazione ma NON i
     newline, per non esporsi al rischio di automatic semicolon insertion.
     Comprime meno, ma non puo' cambiare la semantica.
"""
import re
import sys
import pathlib

NORMAL, STRING, LINE_COMMENT, BLOCK_COMMENT = range(4)


def scan(text, js=False):
    """Restituisce [(kind, chunk)] con kind in {'code','string'}.
    I commenti sono scartati durante la scansione."""
    out = []
    buf = []
    i, n = 0, len(text)
    state = NORMAL
    quote = ""

    def flush(kind):
        if buf:
            out.append((kind, "".join(buf)))
            buf.clear()

    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if state == NORMAL:
            if c == "/" and nxt == "*":
                flush("code")
                state = BLOCK_COMMENT
                i += 2
                continue
            if js and c == "/" and nxt == "/":
                flush("code")
                state = LINE_COMMENT
                i += 2
                continue
            if c in "\"'" or (js and c == "`"):
                flush("code")
                quote = c
                buf.append(c)
                state = STRING
                i += 1
                continue
            buf.append(c)
            i += 1

        elif state == STRING:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(text[i + 1])
                i += 2
                continue
            if c == quote:
                flush("string")
                state = NORMAL
            i += 1

        elif state == LINE_COMMENT:
            if c == "\n":
                buf.append("\n")  # conserva il newline: conta per l'ASI
                flush("code")
                state = NORMAL
            i += 1

        elif state == BLOCK_COMMENT:
            if c == "*" and nxt == "/":
                state = NORMAL
                i += 2
                continue
            i += 1

    flush("code")
    return out


def minify_css(css):
    parts = []
    for kind, chunk in scan(css, js=False):
        if kind == "string":
            parts.append(chunk)
            continue
        chunk = re.sub(r"\s+", " ", chunk)
        chunk = re.sub(r"\s*([{}:;,>])\s*", r"\1", chunk)
        chunk = chunk.replace(";}", "}")
        parts.append(chunk)
    return "".join(parts).strip()


def minify_js(js):
    parts = []
    for kind, chunk in scan(js, js=True):
        if kind == "string":
            parts.append(chunk)
            continue
        chunk = re.sub(r"(?m)[ \t]+$", "", chunk)
        chunk = re.sub(r"(?m)^[ \t]+", "", chunk)
        chunk = re.sub(r"[ \t]{2,}", " ", chunk)
        chunk = re.sub(r"\n{2,}", "\n", chunk)
        parts.append(chunk)
    return "".join(parts).strip() + "\n"


def main():
    root = pathlib.Path(sys.argv[1])
    tb = ta = 0
    for path in sorted(list(root.glob("css/*.css")) + list(root.glob("js/*.js"))):
        if ".min." in path.name:
            continue
        src = path.read_text(encoding="utf-8")
        # Nessun literal regex nel sorgente JS: la macchina a stati non li
        # gestisce, quindi si verifica esplicitamente l'assunzione.
        if path.suffix == ".js":
            stripped = "".join(c for k, c in scan(src, js=True) if k == "code")
            assert "=/" not in stripped.replace(" ", ""), f"regex literal in {path.name}"
        out = minify_css(src) if path.suffix == ".css" else minify_js(src)
        dest = path.with_suffix(".min" + path.suffix)
        dest.write_text(out, encoding="utf-8")
        b, a = len(src.encode()), len(out.encode())
        tb += b
        ta += a
        print(f"{path.name:16} {b:>7} -> {a:>7}  (-{100 - a * 100 // b}%)")
    print(f"{'TOTALE':16} {tb:>7} -> {ta:>7}  (-{100 - ta * 100 // tb}%)")


if __name__ == "__main__":
    main()
