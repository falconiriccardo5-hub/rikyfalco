#!/bin/bash
# FitManager — accesso dall'iPhone ovunque, senza installare nulla sul telefono.
# Un tunnel sul Mac pubblica il gestionale su un indirizzo https: su iPhone
# basta Safari. I dati restano sul Mac.
set -euo pipefail

DATI="$HOME/Library/Application Support/FitManager"
CONFIG="$DATI/config.env"
AGENTE_APP="$HOME/Library/LaunchAgents/it.fitmanager.server.plist"
AGENTE_TUNNEL="$HOME/Library/LaunchAgents/it.fitmanager.tunnel.plist"
PORTA="${PORT:-4000}"

if [ ! -f "$AGENTE_APP" ]; then
  echo "Prima esegui mac/installa.command."
  read -r -p "Premi Invio per chiudere." _ ; exit 1
fi

# --- 1. password (obbligatoria: l'indirizzo sara' raggiungibile da internet) ---
mkdir -p "$DATI/log"; touch "$CONFIG"; chmod 600 "$CONFIG"
if ! grep -q '^APP_PASSWORD=..*' "$CONFIG" 2>/dev/null; then
  echo "Serve una password per proteggere il gestionale."
  while true; do
    read -r -s -p "Scegli una password (almeno 10 caratteri): " PASS; echo
    read -r -s -p "Ripetila: " PASS2; echo
    [ "$PASS" = "$PASS2" ] || { echo "Non coincidono, riprova."; continue; }
    [ "${#PASS}" -ge 10 ] || { echo "Troppo corta, riprova."; continue; }
    break
  done
  {
    grep -v -E '^(APP_PASSWORD|APP_SECRET)=' "$CONFIG" 2>/dev/null || true
    echo "APP_PASSWORD=$PASS"
    echo "APP_SECRET=$(openssl rand -hex 24)"
  } > "$CONFIG.nuovo"
  mv "$CONFIG.nuovo" "$CONFIG"; chmod 600 "$CONFIG"
  /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:FITMANAGER_CONFIG string $CONFIG" "$AGENTE_APP" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:FITMANAGER_CONFIG $CONFIG" "$AGENTE_APP"
  launchctl bootout "gui/$UID/it.fitmanager.server" 2>/dev/null || true
  launchctl bootstrap "gui/$UID" "$AGENTE_APP" 2>/dev/null || launchctl load -w "$AGENTE_APP"
  echo "Password impostata."
else
  echo "Password gia' configurata (per cambiarla: cancella la riga APP_PASSWORD da $CONFIG)."
fi

# --- 2. quale tunnel ---
echo
echo "Come vuoi pubblicare il gestionale?"
echo "  1) ngrok — indirizzo fisso, serve un account gratuito (consigliato)"
echo "  2) Cloudflare — nessun account, ma l'indirizzo cambia a ogni riavvio del Mac"
read -r -p "Scelta [1/2]: " SCELTA

installa_con_brew() {
  if command -v brew >/dev/null 2>&1; then brew install "$1" && return 0; fi
  return 1
}

case "$SCELTA" in
  1)
    if ! command -v ngrok >/dev/null 2>&1; then
      echo "Installo ngrok..."
      installa_con_brew ngrok/ngrok/ngrok || {
        echo "Installalo da https://ngrok.com/download, poi rilancia questo file."
        read -r -p "Premi Invio per chiudere." _ ; exit 1; }
    fi
    echo
    echo "Su https://dashboard.ngrok.com registrati (gratis), poi:"
    echo "  - copia il token da 'Your Authtoken'"
    echo "  - in 'Domains' crea il dominio statico gratuito (es. qualcosa.ngrok-free.app)"
    echo
    read -r -p "Incolla il token: " TOKEN
    read -r -p "Incolla il dominio (senza https://): " DOMINIO
    ngrok config add-authtoken "$TOKEN"
    COMANDO_TUNNEL="$(command -v ngrok)"
    ARG1="http"; ARG2="--url=$DOMINIO"; ARG3="$PORTA"
    INDIRIZZO="https://$DOMINIO"
    ;;
  2)
    if ! command -v cloudflared >/dev/null 2>&1; then
      echo "Installo cloudflared..."
      installa_con_brew cloudflared || {
        echo "Installalo da https://github.com/cloudflare/cloudflared/releases, poi rilancia."
        read -r -p "Premi Invio per chiudere." _ ; exit 1; }
    fi
    COMANDO_TUNNEL="$(command -v cloudflared)"
    ARG1="tunnel"; ARG2="--no-autoupdate"; ARG3="--url=http://localhost:$PORTA"
    INDIRIZZO=""
    ;;
  *) echo "Scelta non valida."; read -r -p "Premi Invio per chiudere." _ ; exit 1 ;;
esac

# --- 3. il tunnel parte da solo a ogni accesso, come l'app ---
cat > "$AGENTE_TUNNEL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>it.fitmanager.tunnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>$COMANDO_TUNNEL</string>
    <string>$ARG1</string>
    <string>$ARG2</string>
    <string>$ARG3</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DATI/log/tunnel.log</string>
  <key>StandardErrorPath</key><string>$DATI/log/tunnel.log</string>
</dict>
</plist>
PLIST

: > "$DATI/log/tunnel.log"
launchctl bootout "gui/$UID/it.fitmanager.tunnel" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$AGENTE_TUNNEL" 2>/dev/null || launchctl load -w "$AGENTE_TUNNEL"
echo "Tunnel avviato, attendo l'indirizzo..."
sleep 6

if [ -z "$INDIRIZZO" ]; then
  INDIRIZZO="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$DATI/log/tunnel.log" | head -1 || true)"
fi

echo
echo "================================================================"
if [ -n "$INDIRIZZO" ]; then
  echo " Apri Safari sull'iPhone su:"
  echo
  echo "     $INDIRIZZO"
  echo
  echo " Inserisci la password, poi Condividi > \"Aggiungi a Home\"."
else
  echo " Non sono riuscito a leggere l'indirizzo. Controlla:"
  echo "     $DATI/log/tunnel.log"
fi
echo "================================================================"
echo
echo "Il gestionale e' raggiungibile solo mentre il Mac e' acceso e sveglio:"
echo "Impostazioni di Sistema > Batteria > Opzioni > \"Impedisci lo stop"
echo "automatico quando lo schermo e' spento\"."
echo
echo "Per chiudere l'accesso da internet:"
echo "  launchctl bootout gui/\$UID/it.fitmanager.tunnel && rm \"$AGENTE_TUNNEL\""
read -r -p "Premi Invio per chiudere." _
