#!/usr/bin/env python3
"""Crea IceUltimate.unitypackage da Assets/IceUltimate (con .meta deterministici).

Uso: python3 tools_make_unitypackage.py
Il pacchetto si importa in Unity con doppio clic (o Assets > Import Package).
Scrive anche i file .meta mancanti accanto agli asset, cosi' cartella e
pacchetto hanno gli stessi GUID.
"""
import io
import os
import tarfile
import uuid

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "Assets", "IceUltimate")
OUT = os.path.join(ROOT, "IceUltimate.unitypackage")
NS = uuid.UUID("6f1c2d0e-9a57-4b8e-8e2a-1ce0017a7e00")


def guid_for(rel):
    return uuid.uuid5(NS, rel).hex


def meta_text(rel, is_dir):
    lines = ["fileFormatVersion: 2", f"guid: {guid_for(rel)}"]
    if is_dir:
        lines += ["folderAsset: yes", "DefaultImporter:", "  externalObjects: {}", "  userData: ",
                  "  assetBundleName: ", "  assetBundleVariant: "]
    return "\n".join(lines) + "\n"


def ensure_meta(path, rel, is_dir):
    mp = path + ".meta"
    if not os.path.exists(mp):
        with open(mp, "w", newline="\n") as f:
            f.write(meta_text(rel, is_dir))
    with open(mp) as f:
        for line in f:
            if line.startswith("guid:"):
                return line.split(":", 1)[1].strip(), open(mp, "rb").read()
    raise RuntimeError("meta senza guid: " + mp)


def add_bytes(tar, name, data):
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = 0o644
    tar.addfile(info, io.BytesIO(data))


def main():
    entries = []
    base = os.path.join(ROOT, "Assets")
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = sorted(d for d in dirnames if d != "Generated")
        rel_dir = "Assets/" + os.path.relpath(dirpath, base).replace(os.sep, "/")
        entries.append((dirpath, rel_dir, True))
        for fn in sorted(filenames):
            if fn.endswith(".meta"):
                continue
            entries.append((os.path.join(dirpath, fn), f"{rel_dir}/{fn}", False))
    with tarfile.open(OUT, "w:gz") as tar:
        for path, rel, is_dir in entries:
            guid, meta = ensure_meta(path, rel, is_dir)
            add_bytes(tar, f"{guid}/pathname", rel.encode())
            add_bytes(tar, f"{guid}/asset.meta", meta)
            if not is_dir:
                with open(path, "rb") as f:
                    add_bytes(tar, f"{guid}/asset", f.read())
    print(f"{OUT}: {len(entries)} voci")


if __name__ == "__main__":
    main()
