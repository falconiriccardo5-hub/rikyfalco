#!/bin/bash
# Ferma FitManager e rimuove avvio automatico e icona. I dati NON vengono cancellati.
set -euo pipefail
AGENTE="$HOME/Library/LaunchAgents/it.fitmanager.server.plist"

launchctl bootout "gui/$UID/it.fitmanager.server" 2>/dev/null || launchctl unload -w "$AGENTE" 2>/dev/null || true
rm -f "$AGENTE"
rm -rf "$HOME/Applications/FitManager.app" "$HOME/Desktop/FitManager.app"

echo "FitManager disattivato."
echo "I dati restano in: $HOME/Library/Application Support/FitManager"
read -r -p "Premi Invio per chiudere." _
