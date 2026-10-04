param([ValidateRange(1024, 65535)][int]$Port = 4317)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$origin = "http://127.0.0.1:$Port"
$dataDirectory = Join-Path $projectRoot '.atelier'
$startupTimeoutSeconds = 30
$launchLock = New-Object Threading.Mutex($false, "Local\AtelierLauncher-$Port")
$hasLaunchLock = $false

function Test-LocalPort {
    $connection = New-Object Net.Sockets.TcpClient
    try {
        $pending = $connection.ConnectAsync('127.0.0.1', $Port)
        return $pending.Wait(1000) -and $connection.Connected
    } catch {
        return $false
    } finally {
        $connection.Dispose()
    }
}

function Get-AtelierToken {
    $page = Invoke-WebRequest -UseBasicParsing -Uri "$origin/" -TimeoutSec 3
    $tokenMatch = [regex]::Match($page.Content, 'name="atelier-token" content="([^"]+)"')
    if (-not $tokenMatch.Success) {
        throw "Le port $Port est utilise par un autre service."
    }
    $token = $tokenMatch.Groups[1].Value
    $state = Invoke-RestMethod -Uri "$origin/api/state" -Headers @{'X-Atelier-Token' = $token} -TimeoutSec 3
    if (-not $state.root -or [IO.Path]::GetFullPath($state.root) -ne $projectRoot) {
        throw "Le port $Port appartient a un autre projet Atelier."
    }
    return $token
}

try {
    $hasLaunchLock = $launchLock.WaitOne([TimeSpan]::FromSeconds($startupTimeoutSeconds))
    if (-not $hasLaunchLock) { throw 'Un autre lancement Atelier est encore en cours.' }
    $electron = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
    if (-not (Test-Path -LiteralPath $electron -PathType Leaf)) {
        throw 'Les dependances desktop sont absentes. Executer npm ci puis npm run vendor dans le projet.'
    }
    if (-not (Test-LocalPort)) {
        & (Join-Path $PSScriptRoot 'start-atelier.ps1') -Port $Port -NoOpen | Out-Null
        $deadline = [DateTime]::UtcNow.AddSeconds($startupTimeoutSeconds)
        while (-not (Test-LocalPort)) {
            if ([DateTime]::UtcNow -ge $deadline) {
                throw 'Le service Atelier ne demarre pas. Consulter .atelier\server.err.log.'
            }
            Start-Sleep -Milliseconds 250
        }
    }
    $token = Get-AtelierToken
    $desktop = Invoke-RestMethod -Method Post -Uri "$origin/api/desktop/open" -Headers @{'X-Atelier-Token' = $token} -ContentType 'application/json' -Body '{"mode":"chat"}' -TimeoutSec 10
    if (-not $desktop.opened) { throw 'La fenetre Atelier ne peut pas etre ouverte.' }
    Write-Output "Atelier ouvert : $origin (desktop PID $($desktop.pid))."
} catch {
    New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
    $message = $_.Exception.Message
    Add-Content -LiteralPath (Join-Path $dataDirectory 'launcher.log') -Value "$([DateTime]::Now.ToString('s')) $message" -Encoding UTF8
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.MessageBox]::Show("$message`n`nJournal : $dataDirectory\launcher.log", 'Atelier', 'OK', 'Error') | Out-Null
    throw
} finally {
    if ($hasLaunchLock) { $launchLock.ReleaseMutex() }
    $launchLock.Dispose()
}
