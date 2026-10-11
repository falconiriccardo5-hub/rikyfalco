# Installazione completa di FlowCut su Windows.
# Avviato da INSTALLA-FLOWCUT.bat (nella cartella principale del repository).
#
#  1. Node.js LTS (se manca: winget, altrimenti installer ufficiale .msi)
#  2. dipendenze dell'app (npm install, include FFmpeg per Windows)
#  3. whisper.cpp (ultima release ufficiale, versione CPU) in %LOCALAPPDATA%\FlowCut\whisper
#  4. modello Whisper in %APPDATA%\FlowCut\models
#  5. impostazioni dell'app aggiornate con i percorsi di whisper e del modello
#  6. creazione dell'installabile e installazione di FlowCut (con collegamento sul desktop)
#
# Parametri (opzionali):
#   -Modello tiny|base|small|medium|large-v3-turbo-q5_0|large-v3-turbo   (predefinito: chiesto, altrimenti small)
#   -SenzaWhisper        salta whisper.cpp e il modello
#   -SenzaInstallabile   non crea/installa l'app: si avvia con avvia-windows.bat
#   -NonInterattivo      nessuna domanda (usa i valori predefiniti)
#   -NonAvviare          non avvia FlowCut al termine
#   -SenzaVoce           non installa Piper (voce narrante) e la voce italiana

param(
  [string]$Modello = '',
  [switch]$SenzaWhisper,
  [switch]$SenzaInstallabile,
  [switch]$NonInterattivo,
  [switch]$NonAvviare,
  [switch]$SenzaVoce
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$AppDir = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $env:APPDATA 'FlowCut'
$ModelsDir = Join-Path $DataDir 'models'
$WhisperDir = Join-Path $env:LOCALAPPDATA 'FlowCut\whisper'
$Modelli = @('tiny', 'base', 'small', 'medium', 'large-v3-turbo-q5_0', 'large-v3-turbo')

function Titolo([string]$t) {
  Write-Host ''
  Write-Host ('=' * 64) -ForegroundColor DarkYellow
  Write-Host "  $t" -ForegroundColor Yellow
  Write-Host ('=' * 64) -ForegroundColor DarkYellow
}
function Ok([string]$t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info([string]$t) { Write-Host "  $t" }
function Avviso([string]$t) { Write-Host "  [!] $t" -ForegroundColor Yellow }

function Scarica([string]$url, [string]$dest) {
  $dir = Split-Path -Parent $dest
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $tmp = "$dest.part"
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & curl.exe -L --fail --retry 3 --progress-bar -o $tmp $url
    if ($LASTEXITCODE -ne 0) { throw "Download non riuscito: $url" }
  } else {
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  }
  Move-Item -Force $tmp $dest
}

function Aggiorna-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user;$env:ProgramFiles\nodejs"
}

function Versione-Node {
  $n = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $n) { return 0 }
  $v = (& node.exe --version) -replace '^v', ''
  return [int]($v.Split('.')[0])
}

function Esegui([string]$exe, [string[]]$argomenti, [string]$errore) {
  & $exe @argomenti
  if ($LASTEXITCODE -ne 0) { throw $errore }
}

try {
  Write-Host ''
  Write-Host '  FlowCut - installazione completa' -ForegroundColor White
  Write-Host "  Cartella dell'app: $AppDir"

  # ---------------------------------------------------------------- 1. Node.js
  Titolo '1/6  Node.js'
  Aggiorna-Path
  if ((Versione-Node) -ge 20) {
    Ok "Node.js $(& node.exe --version) gia' installato"
  } else {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    $installato = $false
    if ($winget) {
      Info 'Installazione di Node.js LTS con winget...'
      & winget.exe install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
      Aggiorna-Path
      $installato = ((Versione-Node) -ge 20)
    }
    if (-not $installato) {
      Info "Download dell'installer ufficiale di Node.js..."
      $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
      $lts = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
      $msi = Join-Path $env:TEMP "node-$($lts.version)-x64.msi"
      Scarica "https://nodejs.org/dist/$($lts.version)/node-$($lts.version)-x64.msi" $msi
      Info 'Installazione (potrebbe essere richiesta la conferma di Windows)...'
      $p = Start-Process msiexec.exe -ArgumentList @('/i', "`"$msi`"", '/qb', '/norestart') -Wait -PassThru
      if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "Installazione di Node.js non riuscita (codice $($p.ExitCode))." }
      Aggiorna-Path
    }
    if ((Versione-Node) -lt 20) { throw 'Node.js non risulta installato. Installalo da https://nodejs.org e riavvia questo script.' }
    Ok "Node.js $(& node.exe --version) installato"
  }

  # ---------------------------------------------------------------- 2. dipendenze
  Titolo "2/6  Dipendenze dell'app (npm install)"
  Push-Location $AppDir
  try {
    Esegui 'npm.cmd' @('install', '--no-audit', '--no-fund') 'npm install non riuscito: controlla la connessione e riprova.'
  } finally { Pop-Location }
  Ok 'Dipendenze installate (FFmpeg incluso)'

  # ---------------------------------------------------------------- 3-4. whisper
  $cli = ''
  $modelPath = ''
  if ($SenzaWhisper) {
    Titolo '3/6  whisper.cpp (saltato)'
    Titolo '4/6  Modello Whisper (saltato)'
  } else {
    Titolo '3/6  whisper.cpp (trascrizione locale)'
    $esistente = Get-ChildItem -Path $WhisperDir -Recurse -Include 'whisper-cli.exe', 'main.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($esistente) {
      $cli = $esistente.FullName
      Ok "whisper.cpp gia' presente: $cli"
    } else {
      Info "Ricerca della release di whisper.cpp per Windows..."
      $releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/ggml-org/whisper.cpp/releases?per_page=10' -Headers @{ 'User-Agent' = 'FlowCut-installer' } -UseBasicParsing
      $rel = $null
      $asset = $null
      foreach ($r in $releases) {
        if ($r.draft -or $r.prerelease) { continue }
        # Archivio Windows x64 per CPU (il nome cambia tra le versioni).
        $cand = $r.assets | Where-Object {
          $_.name -match '\.zip$' -and $_.name -match 'x64' -and $_.name -match 'bin' -and
          $_.name -notmatch 'cublas|cuda|blas|vulkan|openvino|sycl|arm|xcframework|jar'
        } | Sort-Object { $_.name.Length } | Select-Object -First 1
        if ($cand) { $rel = $r; $asset = $cand; break }
        Info "  $($r.tag_name): nessun archivio per Windows x64 ($(@($r.assets | ForEach-Object { $_.name }) -join ', '))"
      }
      if (-not $asset) { throw 'Nessun archivio di whisper.cpp per Windows x64 trovato nelle ultime release.' }
      $zip = Join-Path $env:TEMP $asset.name
      Info "Download di whisper.cpp $($rel.tag_name) ($($asset.name))..."
      Scarica $asset.browser_download_url $zip
      if (Test-Path $WhisperDir) { Remove-Item -Recurse -Force $WhisperDir }
      New-Item -ItemType Directory -Force -Path $WhisperDir | Out-Null
      Expand-Archive -Path $zip -DestinationPath $WhisperDir -Force
      Remove-Item $zip -Force
      $trovato = Get-ChildItem -Path $WhisperDir -Recurse -Filter 'whisper-cli.exe' | Select-Object -First 1
      if (-not $trovato) { $trovato = Get-ChildItem -Path $WhisperDir -Recurse -Filter 'main.exe' | Select-Object -First 1 }
      if (-not $trovato) { throw "whisper-cli.exe non trovato nell'archivio scaricato." }
      $cli = $trovato.FullName
      Ok "whisper.cpp installato: $cli"
    }

    # whisper-cli.exe richiede le librerie Microsoft Visual C++ (senza, termina subito senza messaggi).
    $vc = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64' -ErrorAction SilentlyContinue
    if ($vc -and $vc.Installed -eq 1) {
      Ok "Librerie Visual C++ presenti ($($vc.Version))"
    } else {
      Info 'Installazione delle librerie Microsoft Visual C++ (richiesta da whisper.cpp)...'
      $redist = Join-Path $env:TEMP 'vc_redist.x64.exe'
      Scarica 'https://aka.ms/vs/17/release/vc_redist.x64.exe' $redist
      $p = Start-Process -FilePath $redist -ArgumentList '/install', '/quiet', '/norestart' -Wait -PassThru
      if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010 -and $p.ExitCode -ne 1638) { Avviso "Installazione Visual C++ non riuscita (codice $($p.ExitCode)): installala da https://aka.ms/vs/17/release/vc_redist.x64.exe" }
      else { Ok 'Librerie Visual C++ installate' }
    }
    # Verifica che whisper-cli parta davvero.
    $prova = & $cli --help 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -and $prova -notmatch 'usage|options') {
      Avviso "whisper-cli non si avvia (codice $LASTEXITCODE). Riavvia il PC e rilancia lo script; se persiste usa il motore faster-whisper."
    } else { Ok 'whisper-cli funzionante' }

    Titolo '4/6  Modello Whisper'
    if (-not $Modello) {
      if ($NonInterattivo) { $Modello = 'small' } else {
        Info 'Scegli il modello di riconoscimento vocale:'
        Info '  1) base                 142 MB  veloce'
        Info '  2) small                466 MB  buon compromesso (consigliato)'
        Info '  3) large-v3-turbo-q5_0  547 MB  qualita'' molto alta, piu'' lento'
        $scelta = Read-Host '  Numero [2]'
        switch ($scelta) {
          '1' { $Modello = 'base' }
          '3' { $Modello = 'large-v3-turbo-q5_0' }
          default { $Modello = 'small' }
        }
      }
    }
    if ($Modelli -notcontains $Modello) { throw "Modello sconosciuto: $Modello. Valori ammessi: $($Modelli -join ', ')" }
    $modelPath = Join-Path $ModelsDir "ggml-$Modello.bin"
    if (Test-Path $modelPath) {
      Ok "Modello gia' presente: $modelPath"
    } else {
      Info "Download del modello $Modello da Hugging Face..."
      Scarica "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$Modello.bin" $modelPath
      Ok "Modello scaricato: $modelPath"
    }
  }

  # ---------------------------------------------------------------- 5. impostazioni
  # ---------------------------------------------------------------- voce narrante (Piper)
  $piperExe = ''
  if (-not $SenzaVoce) {
    Titolo 'Voce narrante (Piper, sintesi vocale)'
    $PiperDir = Join-Path $DataDir 'piper'
    $trovatoP = Get-ChildItem -Path $PiperDir -Recurse -Filter 'piper.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $trovatoP) {
      Info 'Download di Piper...'
      $zipP = Join-Path $env:TEMP 'piper_windows_amd64.zip'
      Scarica 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip' $zipP
      New-Item -ItemType Directory -Force -Path $PiperDir | Out-Null
      Expand-Archive -Path $zipP -DestinationPath $PiperDir -Force
      Remove-Item $zipP -Force
      $trovatoP = Get-ChildItem -Path $PiperDir -Recurse -Filter 'piper.exe' | Select-Object -First 1
    }
    if ($trovatoP) {
      $piperExe = $trovatoP.FullName
      Ok "Piper installato: $piperExe"
      $VoicesDir = Join-Path $DataDir 'voices'
      $voce = Join-Path $VoicesDir 'it_IT-paola-medium.onnx'
      if (-not (Test-Path $voce) -or -not (Test-Path "$voce.json")) {
        Info 'Download della voce italiana "Paola" (circa 63 MB)...'
        $baseV = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium'
        Scarica "$baseV.onnx.json" "$voce.json"
        Scarica "$baseV.onnx" $voce
      }
      Ok 'Voce italiana pronta (altre voci: Impostazioni -> Voce narrante)'
    } else { Avviso 'Piper non trovato nell''archivio: installalo dalle Impostazioni dell''app.' }
  }

  Titolo "5/6  Impostazioni dell'app"
  New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
  $settingsFile = Join-Path $DataDir 'settings.json'
  $s = [ordered]@{}
  if (Test-Path $settingsFile) {
    try {
      $raw = [IO.File]::ReadAllText($settingsFile)
      $obj = $raw.TrimStart([char]0xFEFF) | ConvertFrom-Json
      foreach ($p in $obj.PSObject.Properties) { $s[$p.Name] = $p.Value }
    } catch { Avviso 'Impostazioni esistenti non leggibili: verranno ricreate.' }
  }
  if ($cli) { $s['whisperCliPath'] = $cli }
  if ($modelPath) { $s['whisperModelPath'] = $modelPath }
  if ($piperExe) { $s['piperPath'] = $piperExe }
  if (-not $s.Contains('defaultLanguage')) { $s['defaultLanguage'] = 'it' }
  if (-not $s.Contains('recentProjects')) { $s['recentProjects'] = @() }
  $json = $s | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText($settingsFile, $json, (New-Object System.Text.UTF8Encoding $false))
  Ok "Impostazioni salvate in $settingsFile"

  # ---------------------------------------------------------------- 6. app
  $exe = Join-Path $env:LOCALAPPDATA 'Programs\FlowCut\FlowCut.exe'
  if ($SenzaInstallabile) {
    Titolo '6/6  Installazione app (saltata)'
    Info "Avvia FlowCut con: $AppDir\avvia-windows.bat"
  } else {
    Titolo "6/6  Creazione e installazione di FlowCut"
    Push-Location $AppDir
    try {
      & npm.cmd run dist:win
      if ($LASTEXITCODE -ne 0) {
        # Su alcuni PC electron-builder non riesce a estrarre gli strumenti di firma
        # (link simbolici senza "Modalita' sviluppatore"): si riprova senza modificare l'eseguibile.
        Avviso 'Primo tentativo non riuscito: nuovo tentativo senza la personalizzazione dell''eseguibile...'
        Esegui 'npx.cmd' @('electron-builder', '--win', 'nsis', '-c.win.signAndEditExecutable=false') "Creazione dell'installabile non riuscita."
      }
    } finally { Pop-Location }
    $setup = Get-ChildItem -Path (Join-Path $AppDir 'dist') -Filter 'FlowCut-Setup-*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $setup) { throw 'Installabile non trovato in app\dist.' }
    Info "Installazione di $($setup.Name)..."
    $p = Start-Process -FilePath $setup.FullName -ArgumentList '/S' -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "Installazione non riuscita (codice $($p.ExitCode))." }
    if (-not (Test-Path $exe)) {
      $alt = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Programs') -Recurse -Filter 'FlowCut.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($alt) { $exe = $alt.FullName } else { throw 'FlowCut.exe non trovato dopo l''installazione.' }
    }
    Ok "FlowCut installato: $exe"
    Ok "Installabile disponibile anche in: $($setup.FullName)"
  }

  Write-Host ''
  Write-Host '  Installazione completata!' -ForegroundColor Green
  if ($cli) { Info "Trascrizione pronta: whisper.cpp + modello $Modello" }
  Info 'Trovi FlowCut nel menu Start e sul desktop.'
  if (-not $NonAvviare) {
    if ($SenzaInstallabile) {
      Start-Process -FilePath (Join-Path $AppDir 'avvia-windows.bat') -WorkingDirectory $AppDir
    } else {
      Start-Process -FilePath $exe
    }
  }
  exit 0
} catch {
  Write-Host ''
  Write-Host "  ERRORE: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host '  Correggi il problema e riavvia INSTALLA-FLOWCUT.bat: i passaggi gia'' completati vengono saltati.' -ForegroundColor Red
  exit 1
}
