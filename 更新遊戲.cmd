@echo off
title Update testPB
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Update-Game.ps1"
if errorlevel 1 pause
