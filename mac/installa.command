#!/bin/bash
# FitManager — installazione su macOS.
# Fa partire il gestionale a ogni accesso al Mac e crea l'icona di avvio.
set -euo pipefail

PROGETTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${PORT:-4000}"
DATI="$HOME/Library/Application Support/FitManager"
AGENTE="$HOME/Library/LaunchAgents/it.fitmanager.server.plist"
APP="$HOME/Applications/FitManager.app"

echo "FitManager — installazione"
echo "Progetto: $PROGETTO"
echo

# 1. Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non risulta installato."
  echo "Installalo da https://nodejs.org (versione LTS) e rilancia questo file."
  read -r -p "Premi Invio per chiudere." _ ; exit 1
fi
NODE_BIN="$(command -v node)"
VERSIONE="$("$NODE_BIN" -p 'process.versions.node')"
if ! "$NODE_BIN" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)'; then
  echo "Serve Node.js 22.5 o superiore (trovata $VERSIONE)."
  echo "Aggiorna da https://nodejs.org e rilancia questo file."
  read -r -p "Premi Invio per chiudere." _ ; exit 1
fi
echo "Node.js $VERSIONE trovato in $NODE_BIN"

# 2. Cartella dati fuori dal progetto: resta anche se aggiorni o sposti il codice.
mkdir -p "$DATI/backup"
if [ -f "$PROGETTO/data/fitmanager.db" ] && [ ! -f "$DATI/fitmanager.db" ]; then
  cp "$PROGETTO/data/fitmanager.db" "$DATI/fitmanager.db"
  echo "Database esistente copiato in $DATI"
fi
echo "Dati e backup: $DATI"

# 3. Avvio automatico a ogni accesso, con riavvio in caso di crash.
mkdir -p "$HOME/Library/LaunchAgents" "$DATI/log"
cat > "$AGENTE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>it.fitmanager.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$PROGETTO/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>$PROGETTO</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>$PORTA</string>
    <key>DB_FILE</key><string>$DATI/fitmanager.db</string>
    <key>BACKUP_DIR</key><string>$DATI/backup</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DATI/log/server.log</string>
  <key>StandardErrorPath</key><string>$DATI/log/errori.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$UID/it.fitmanager.server" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$AGENTE" 2>/dev/null || launchctl load -w "$AGENTE"
echo "Avvio automatico configurato."

# 4. Icona di avvio (apre il gestionale nel browser).
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>FitManager</string>
  <key>CFBundleDisplayName</key><string>FitManager</string>
  <key>CFBundleIdentifier</key><string>it.fitmanager.avvio</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>FitManager</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST
cat > "$APP/Contents/MacOS/FitManager" <<AVVIO
#!/bin/bash
# Apre il gestionale, riavviando il server se non sta rispondendo.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null --max-time 1 "http://localhost:$PORTA/"; then
    open "http://localhost:$PORTA/"
    exit 0
  fi
  [ "\$i" = "1" ] && launchctl kickstart -k "gui/\$UID/it.fitmanager.server" 2>/dev/null
  sleep 1
done
open "http://localhost:$PORTA/"
AVVIO
chmod +x "$APP/Contents/MacOS/FitManager"
ln -sfn "$APP" "$HOME/Desktop/FitManager.app" 2>/dev/null || true
echo "Icona creata: $APP (e collegamento sulla Scrivania)."

# 5. Apertura
sleep 2
open "http://localhost:$PORTA/" 2>/dev/null || true
echo
echo "Fatto. Il gestionale e' attivo su http://localhost:$PORTA"
echo "Si riavvia da solo a ogni accesso al Mac. Per aprirlo: icona FitManager."
read -r -p "Premi Invio per chiudere questa finestra." _
