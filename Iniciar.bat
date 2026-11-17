@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Filora
echo.
echo   Arrancando Filora...
echo   Se abrira en tu navegador: http://localhost:8765
echo   Deja esta ventana abierta mientras la uses.
echo.
echo   Buscando actualizaciones...
where git >nul 2>nul && if exist ".git" (
  rem la cartelera de GitHub manda sobre la descargada en el PC
  git checkout -- data/cartelera.json data/estrenos.json data/fa_cache.json >nul 2>nul
  git pull --ff-only -q origin main && echo   Filora esta al dia. || echo   No pude actualizar: se abre la version que tienes.
)
python server.py
if errorlevel 1 (
  echo.
  echo   Algo ha fallado. Comprueba que Python esta instalado.
  pause
)
