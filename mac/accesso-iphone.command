#!/bin/bash
# FitManager — abilita l'accesso dall'iPhone.
# Il gestionale resta sul Mac: l'iPhone lo raggiunge in rete locale e, con
# Tailscale, anche fuori casa. I dati non escono mai dal tuo Mac.
set -euo pipefail

AGENTE="$HOME/Library/LaunchAgents/it.fitmanager.server.plist"
DATI="$HOME/Library/Application Support/FitManager"
CONFIG="$DATI/config.env"
PORTA="${PORT:-4000}"

if [ ! -f "$AGENTE" ]; then
  echo "Prima esegui mac/installa.command."
  read -r -p "Premi Invio per chiudere." _ ; exit 1
fi

echo "FitManager — accesso da iPhone"
echo
echo "Il gestionale verra' reso raggiungibile dagli altri tuoi dispositivi."
echo "Serve una password: senza, chiunque sia sulla stessa rete potrebbe aprirlo."
echo
while true; do
  read -r -s -p "Scegli una password (almeno 8 caratteri): " PASS; echo
  read -r -s -p "Ripetila: " PASS2; echo
  [ "$PASS" = "$PASS2" ] || { echo "Le due password non coincidono, riprova."; continue; }
  [ "${#PASS}" -ge 8 ] || { echo "Troppo corta, riprova."; continue; }
  break
done

# Le credenziali stanno in un file riservato, non nel plist.
mkdir -p "$DATI"
touch "$CONFIG"; chmod 600 "$CONFIG"
SEGRETO="$(openssl rand -hex 24)"
{
  grep -v -E '^(HOST|APP_PASSWORD|APP_SECRET)=' "$CONFIG" 2>/dev/null || true
  echo "HOST=0.0.0.0"
  echo "APP_PASSWORD=$PASS"
  echo "APP_SECRET=$SEGRETO"
} > "$CONFIG.nuovo"
mv "$CONFIG.nuovo" "$CONFIG"; chmod 600 "$CONFIG"

/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:FITMANAGER_CONFIG string $CONFIG" "$AGENTE" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:FITMANAGER_CONFIG $CONFIG" "$AGENTE"

launchctl bootout "gui/$UID/it.fitmanager.server" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$AGENTE" 2>/dev/null || launchctl load -w "$AGENTE"
sleep 2

IP_LOCALE="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
IP_TAILSCALE="$( { tailscale ip -4 2>/dev/null || /Applications/Tailscale.app/Contents/MacOS/Tailscale ip -4 2>/dev/null; } | head -1 || true)"

echo
echo "================================================================"
echo " Apri Safari sull'iPhone e vai a questo indirizzo:"
echo
[ -n "$IP_LOCALE" ] && echo "   In casa (stesso Wi-Fi):  http://$IP_LOCALE:$PORTA"
[ -n "$IP_TAILSCALE" ] && echo "   Ovunque (Tailscale):     http://$IP_TAILSCALE:$PORTA"
[ -z "$IP_TAILSCALE" ] && echo "   Fuori casa: installa Tailscale (vedi README) e rilancia questo file."
echo
echo " Inserisci la password che hai scelto, poi tocca il tasto Condividi"
echo " e scegli \"Aggiungi a Home\": avrai l'icona come una vera app."
echo "================================================================"
echo
echo "L'iPhone vede il gestionale solo mentre il Mac e' acceso e sveglio."
echo "Per tenerlo sempre raggiungibile: Impostazioni di Sistema > Batteria >"
echo "Opzioni > \"Impedisci lo stop automatico quando lo schermo e' spento\"."
read -r -p "Premi Invio per chiudere." _
