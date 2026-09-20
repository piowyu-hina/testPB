$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$updateLock = $null
$transcriptStarted = $false
try {
    try {
        $updateLock = [System.IO.File]::Open((Join-Path $projectRoot '.update-game.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch {
        throw 'Another update is already running. Please wait for that window to finish.'
    }
    Start-Transcript -Path (Join-Path $projectRoot 'update-game.log') -Force | Out-Null
    $transcriptStarted = $true
    $cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
    # Explorer shortcuts can inherit an old PATH from before Node/Rust were installed.
    $nodeBin = Join-Path $env:ProgramFiles 'nodejs'
    $env:Path = $nodeBin + ';' + $cargoBin + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
    Write-Host 'Building game... Please wait.' -ForegroundColor Cyan
    & npm.cmd run desktop:build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. The installed game was not replaced.' }

    $sourceExe = Join-Path $projectRoot 'src-tauri/target/release/testpb.exe'
    $gameExe = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'testPB.exe'))
    $oldGames = @(Get-Process testpb -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $gameExe })
    foreach ($game in $oldGames) {
        [void]$game.CloseMainWindow()
        if (-not $game.WaitForExit(5000)) {
            Stop-Process -Id $game.Id -Force
            $game.WaitForExit()
        }
    }
    # WebView2 may briefly retain the executable after the window closes.
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        try {
            Copy-Item -LiteralPath $sourceExe -Destination $gameExe -Force
            break
        } catch {
            if ($attempt -eq 14) { throw }
            Start-Sleep -Seconds 1
        }
    }
    Start-Process -FilePath $gameExe -WorkingDirectory $projectRoot
    Write-Host 'Updated. Game opened.' -ForegroundColor Green
    Start-Sleep -Seconds 2
    $updateExitCode = 0
} catch {
    Write-Host ('Update failed: ' + $_.Exception.Message) -ForegroundColor Red
    Read-Host 'Press Enter to close'
    $updateExitCode = 1
} finally {
    if ($transcriptStarted) { Stop-Transcript | Out-Null }
    if ($updateLock) { $updateLock.Dispose() }
}
exit $updateExitCode
