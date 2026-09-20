$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
try {
    $cargoBin = Join-Path $env:USERPROFILE '.cargo/bin'
    $env:Path = $cargoBin + ';' + $env:Path
    Write-Host 'Building game... Please wait.' -ForegroundColor Cyan
    & npm.cmd run desktop:build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. The installed game was not replaced.' }

    $sourceExe = Join-Path $projectRoot 'src-tauri/target/release/testpb.exe'
    $gameExe = Join-Path $projectRoot 'testPB.exe'
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
    exit 0
} catch {
    Write-Host ('Update failed: ' + $_.Exception.Message) -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
