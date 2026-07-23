@echo off
REM ============================================
REM  ELISHAMA — Demarrage automatique (Windows)
REM  Placez ce fichier dans le dossier du projet
REM  et double-cliquez pour lancer l'application
REM ============================================
cd /d "%~dp0"
title ELISHAMA - Gestion de Restaurant
echo.
echo  ==========================================
echo   ELISHAMA - Demarrage de l'application
echo  ==========================================
echo.
echo  L'application va demarrer...
echo  Ne fermez PAS cette fenetre pendant l'utilisation.
echo.
echo  Une fois "Ready" affiche ci-dessous, ouvrez :
echo    http://localhost:3000
echo.
echo  Pour installer comme application (PWA) :
echo    Dans Chrome/Edge, cliquez sur l'icone Installer
echo    a droite de la barre d'adresse.
echo.
echo  Pour arreter : fermez cette fenetre ou Ctrl+C.
echo.
echo  ------------------------------------------
echo.
npm run start
pause
