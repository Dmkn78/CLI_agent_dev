$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'open-atelier.ps1'
$powershell = Join-Path $PSHOME $(if ($PSEdition -eq 'Core') { 'pwsh.exe' } else { 'powershell.exe' })
$windowsPowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$electron = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { throw 'Lanceur Atelier absent.' }
if (-not (Test-Path -LiteralPath $electron -PathType Leaf)) { throw 'Dependances desktop absentes. Executer npm ci.' }

$shortcutPaths = @(
    (Join-Path ([Environment]::GetFolderPath('Programs', [Environment+SpecialFolderOption]::DoNotVerify)) 'Atelier.lnk'),
    (Join-Path ([Environment]::GetFolderPath('DesktopDirectory', [Environment+SpecialFolderOption]::DoNotVerify)) 'Atelier.lnk')
)
$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in $shortcutPaths) {
    if (Test-Path -LiteralPath $shortcutPath) {
        $existing = $shell.CreateShortcut($shortcutPath)
        if ($existing.TargetPath -notin @($powershell, $windowsPowerShell) -or -not $existing.Arguments.Contains($launcher)) {
            throw "Un autre raccourci Atelier existe deja : $shortcutPath"
        }
    }
}
foreach ($shortcutPath in $shortcutPaths) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $shortcutPath) -Force | Out-Null
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = '-NoLogo -NoProfile -STA -WindowStyle Hidden -File "' + $launcher + '"'
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = 'Atelier - agents, canaux de discussion et projets locaux'
    $shortcut.IconLocation = $electron + ',0'
    $shortcut.WindowStyle = 7
    $shortcut.Save()
    Write-Output $shortcutPath
}
