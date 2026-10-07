@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Filora
echo.
echo   Arrancando Filora...
echo   Se abrira en tu navegador: http://localhost:8765
echo   Deja esta ventana abierta mientras la uses.
echo.
python server.py
if errorlevel 1 (
  echo.
  echo   Algo ha fallado. Comprueba que Python esta instalado.
  pause
)
