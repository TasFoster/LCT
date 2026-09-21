@echo off
chcp 65001 >nul
setlocal
rem Запуск 2D-редактора сцены. Двойной щелчок — сервер запускается и редактор открывается в браузере.
rem LCT_NO_BROWSER=1 — не открывать браузер (для проверки).
cd /d "%~dp0editor2d"
title Редактор сцены ЛЦТ

where node >nul 2>nul
if errorlevel 1 (
  echo Не найден Node.js. Установите его с https://nodejs.org ^(версия 20 или новее^) и запустите этот файл снова.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) < 20 ? 1 : 0)"
if errorlevel 1 (
  echo Установлен слишком старый Node.js. Нужна версия 20 или новее: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Первый запуск: ставлю зависимости, это займёт около минуты...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Не удалось установить зависимости.
    pause
    exit /b 1
  )
)

rem редактор уже запущен — просто открыть его, второй сервер не нужен
netstat -ano | findstr /r /c:"127\.0\.0\.1:5173 .*LISTENING" >nul
if not errorlevel 1 (
  echo Редактор уже запущен: http://127.0.0.1:5173
  if not defined LCT_NO_BROWSER start "" http://127.0.0.1:5173
  exit /b 0
)

echo Запускаю редактор: http://127.0.0.1:5173
echo Чтобы остановить, закройте это окно.
if defined LCT_NO_BROWSER (
  call npm run dev
) else (
  call npm run dev -- --open
)
