@echo off
title Laboratorio SFA
color 0A

echo.
echo  ====================================
echo   LABORATORIO SFA - Sistema de Movimientos
echo  ====================================
echo.

:: Verificar si Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js no esta instalado.
    echo  Por favor instala Node.js desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Ir a la carpeta del script
cd /d "%~dp0"

:: Si no existe la base de datos, inicializarla
if not exist "prisma\laboratorio.db" (
    echo  Primera vez: preparando la base de datos...
    call npx prisma migrate deploy >nul 2>&1
    call npx prisma db seed >nul 2>&1
    echo  Base de datos lista.
    echo.
)

:: Abrir el navegador despues de 4 segundos
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo  Iniciando la aplicacion...
echo  Cuando veas el mensaje "Ready", la app esta lista.
echo.
echo  Para cerrar la app, cerrá esta ventana.
echo.

:: Iniciar la app
call npm run dev
