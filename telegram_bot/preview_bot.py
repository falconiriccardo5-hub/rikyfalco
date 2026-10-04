#!/usr/bin/env python3
"""Bot Telegram per anteprima/approvazione di caroselli e reel.

Uso:
  export TELEGRAM_BOT_TOKEN=...          # mai nel codice!
  python preview_bot.py listen           # ascolta /start e i pulsanti
  python preview_bot.py send cartella/   # invia foto (carosello) o video (reel)

Le decisioni vengono salvate in approvals.json.
"""
import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
API = f"https://api.telegram.org/bot{TOKEN}"
STATE = Path(__file__).with_name("state.json")          # chat_id registrato
APPROVALS = Path(__file__).with_name("approvals.json")  # esiti

IMG = {".jpg", ".jpeg", ".png", ".webp"}
VID = {".mp4", ".mov", ".m4v"}


def call(method, data=None, files=None):
    r = requests.post(f"{API}/{method}", data=data, files=files, timeout=120)
    body = r.json()
    if not body.get("ok"):
        sys.exit(f"Errore Telegram su {method}: {body}")
    return body["result"]


def load(path):
    return json.loads(path.read_text()) if path.exists() else {}


def save(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False))


def send(folder, caption):
    chat_id = os.environ.get("TELEGRAM_CHAT_ID") or load(STATE).get("chat_id")
    if not chat_id:
        sys.exit("Chat sconosciuta: manda /start al bot con 'listen' attivo, "
                 "oppure imposta TELEGRAM_CHAT_ID.")
    files = sorted(p for p in Path(folder).iterdir() if p.is_file())
    images = [p for p in files if p.suffix.lower() in IMG]
    videos = [p for p in files if p.suffix.lower() in VID]
    if not images and not videos:
        sys.exit("Nessuna foto o video nella cartella.")

    if videos:  # reel
        for v in videos:
            with v.open("rb") as fh:
                call("sendVideo", {"chat_id": chat_id, "caption": caption,
                                   "supports_streaming": True}, {"video": fh})
    if images:  # carosello (max 10 per album Telegram)
        for i in range(0, len(images), 10):
            batch = images[i:i + 10]
            media, handles = [], {}
            for n, p in enumerate(batch):
                item = {"type": "photo", "media": f"attach://f{n}"}
                if i == 0 and n == 0:
                    item["caption"] = caption
                media.append(item)
                handles[f"f{n}"] = p.open("rb")
            call("sendMediaGroup", {"chat_id": chat_id, "media": json.dumps(media)}, handles)
            for h in handles.values():
                h.close()

    pid = uuid.uuid4().hex[:8]
    kb = {"inline_keyboard": [[
        {"text": "✅ Approva", "callback_data": f"ok:{pid}"},
        {"text": "❌ Rifiuta", "callback_data": f"no:{pid}"},
    ]]}
    call("sendMessage", {"chat_id": chat_id, "reply_markup": json.dumps(kb),
                         "text": f"Anteprima «{Path(folder).name}» pronta. Approvi?"})
    approvals = load(APPROVALS)
    approvals[pid] = {"folder": str(folder), "caption": caption, "status": "pending"}
    save(APPROVALS, approvals)
    print(f"Inviato. ID anteprima: {pid}")


def listen():
    offset = None
    print("In ascolto... (Ctrl+C per uscire)")
    while True:
        updates = call("getUpdates", {"timeout": 50, "offset": offset})
        for u in updates:
            offset = u["update_id"] + 1
            msg = u.get("message")
            if msg and msg.get("text", "").startswith("/start"):
                save(STATE, {"chat_id": msg["chat"]["id"]})
                call("sendMessage", {"chat_id": msg["chat"]["id"],
                                     "text": "Collegato! Qui riceverai caroselli e reel da approvare."})
            cb = u.get("callback_query")
            if cb:
                action, pid = cb["data"].split(":", 1)
                status = "approved" if action == "ok" else "rejected"
                approvals = load(APPROVALS)
                if pid in approvals:
                    approvals[pid]["status"] = status
                    approvals[pid]["decided_at"] = int(time.time())
                    save(APPROVALS, approvals)
                call("answerCallbackQuery", {"callback_query_id": cb["id"]})
                call("editMessageText", {
                    "chat_id": cb["message"]["chat"]["id"],
                    "message_id": cb["message"]["message_id"],
                    "text": "✅ Approvato" if status == "approved" else "❌ Rifiutato"})


if __name__ == "__main__":
    if not TOKEN:
        sys.exit("Imposta la variabile d'ambiente TELEGRAM_BOT_TOKEN.")
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("listen")
    s = sub.add_parser("send")
    s.add_argument("folder")
    s.add_argument("--caption", default="")
    a = ap.parse_args()
    listen() if a.cmd == "listen" else send(a.folder, a.caption)
