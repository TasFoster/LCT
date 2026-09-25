@echo off
chcp 65001 >nul
setlocal
rem Запуск платформы (визард) с редактором плана на шаге 7. Двойной щелчок — сервер
rem запускается и в браузере открывается шаг 7 демо-проекта.
rem LCT_NO_BROWSER=1 — не открывать браузер (для проверки).
cd /d "%~dp0frontend"
title Платформа ЛЦТ: визард и редактор плана

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

rem уже запущено — просто открыть, второй сервер не нужен
netstat -ano | findstr /r /c:"127\.0\.0\.1:5173 .*LISTENING" >nul
if not errorlevel 1 (
  echo Платформа уже запущена: http://127.0.0.1:5173
  if not defined LCT_NO_BROWSER start "" "http://127.0.0.1:5173/projects/p-leningradka/wizard/topology?as=user"
  exit /b 0
)

echo Запускаю платформу: http://127.0.0.1:5173
echo Редактор плана — шаг 7 визарда. Чтобы остановить, закройте это окно.
if defined LCT_NO_BROWSER (
  call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
) else (
  call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open "/projects/p-leningradka/wizard/topology?as=user"
)
