param([int]$Port = 4317, [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root '.atelier'
New-Item -ItemType Directory -Path $data -Force | Out-Null
# Reuse public trust anchors already installed in Windows, never private keys.
# This stays scoped to the child process; explicit CA configuration takes precedence.
if (-not $env:CODEX_CA_CERTIFICATE -and -not $env:SSL_CERT_FILE) {
    $tls = Join-Path $data 'tls'
    New-Item -ItemType Directory -Path $tls -Force | Out-Null
    $bundle = Join-Path $tls 'windows-roots.pem'
    $certificates = @(Get-ChildItem Cert:\CurrentUser\Root) + @(Get-ChildItem Cert:\LocalMachine\Root)
    $pem = foreach ($certificate in ($certificates | Sort-Object Thumbprint -Unique)) {
        '-----BEGIN CERTIFICATE-----'
        [Convert]::ToBase64String($certificate.RawData, [Base64FormattingOptions]::InsertLineBreaks)
        '-----END CERTIFICATE-----'
    }
    if (-not $pem) { throw 'Windows ne fournit aucun certificat racine. Aucun contournement TLS autorisé.' }
    [IO.File]::WriteAllText($bundle, ($pem -join "`n") + "`n", [Text.Encoding]::ASCII)
    $env:CODEX_CA_CERTIFICATE = $bundle
}
$python = (Get-Command python.exe -ErrorAction Stop).Source
if (-not $env:ATELIER_CODEX_EXECUTABLE) {
    $appBin = Join-Path $env:LOCALAPPDATA 'OpenAI/Codex/bin'
    if (Test-Path -LiteralPath $appBin) {
        $native = Get-ChildItem -LiteralPath $appBin -Filter codex.exe -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($native) { $env:ATELIER_CODEX_EXECUTABLE = $native.FullName }
    }
}
$arguments = @('-B', ('"' + (Join-Path $root 'run.py') + '"'), '--port', $Port)
if ($NoOpen) { $arguments += '--no-open' }
$process = Start-Process -FilePath $python -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $data 'server.out.log') -RedirectStandardError (Join-Path $data 'server.err.log')
Write-Output "Atelier PID $($process.Id) : http://127.0.0.1:$Port"
