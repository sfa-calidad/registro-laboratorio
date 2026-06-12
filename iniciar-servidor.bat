@echo off
title Laboratorio SFA - SERVIDOR
color 0B

echo.
echo  ==============================================
echo   LABORATORIO SFA - Modo Servidor (Produccion)
echo  ==============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js no esta instalado.
    echo  Instalar desde https://nodejs.org
    pause
    exit /b 1
)

:: Ir a la carpeta del script
cd /d "%~dp0"

:: Primera vez: preparar base de datos
if not exist "prisma\laboratorio.db" (
    echo  Primera vez: preparando la base de datos...
    call npx prisma db push
    call npx prisma db seed
    echo  Base de datos lista.
    echo.
)

:: Compilar si no existe el build de produccion
if not exist ".next\BUILD_ID" (
    echo  Compilando la aplicacion para produccion...
    echo  Esto puede tardar unos minutos, solo pasa la primera vez
    echo  o despues de una actualizacion.
    call npm run build
    echo.
)

echo  Iniciando en modo produccion...
echo  Los usuarios pueden acceder desde sus navegadores a:
echo.
ipconfig | findstr /i "IPv4"
echo.
echo  (usar esa IP seguida de :3000, ej: http://192.168.1.10:3000)
echo.
echo  NO CERRAR esta ventana mientras se use la app.
echo.

call npm start
