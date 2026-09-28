@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Платформа роботизации — остановка

echo Останавливаю платформу...
docker compose down
echo.
echo Готово. Платформа остановлена, это окно можно закрыть.
pause
