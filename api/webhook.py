"""Webhook Telegram su Vercel: anteprima/approvazione di caroselli e reel.

Mandi foto (anche album) o un video al bot -> risponde con ✅ Approva / ❌ Rifiuta.
Variabili d'ambiente: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
"""
import hmac
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")


def tg(method, payload):
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TOKEN}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    return urllib.request.urlopen(req, timeout=10).read()


def keyboard():
    return {"inline_keyboard": [[
        {"text": "✅ Approva", "callback_data": "ok"},
        {"text": "❌ Rifiuta", "callback_data": "no"},
    ]]}


def handle(update):
    msg = update.get("message")
    if msg:
        chat = msg["chat"]["id"]
        text = msg.get("text", "")
        if text.startswith("/start"):
            tg("sendMessage", {"chat_id": chat, "text":
               "Collegato! Mandami le foto di un carosello o un video (reel) "
               "e ti chiederò di approvarlo."})
        elif "photo" in msg or "video" in msg or "video_note" in msg:
            kind = "Reel" if "video" in msg else "Carosello"
            tg("sendMessage", {"chat_id": chat, "reply_to_message_id": msg["message_id"],
                               "text": f"{kind} ricevuto. Approvi?",
                               "reply_markup": keyboard()})
    cb = update.get("callback_query")
    if cb:
        approved = cb["data"] == "ok"
        tg("answerCallbackQuery", {"callback_query_id": cb["id"]})
        tg("editMessageText", {
            "chat_id": cb["message"]["chat"]["id"],
            "message_id": cb["message"]["message_id"],
            "text": "✅ Approvato" if approved else "❌ Rifiutato"})


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        got = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not SECRET or not hmac.compare_digest(got, SECRET):
            self.send_response(403)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            handle(json.loads(self.rfile.read(length)))
        except Exception as e:  # rispondi 200 comunque: evita retry infiniti
            print("errore:", e)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"bot attivo")
