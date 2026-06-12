@echo off
title Laboratorio SFA - Actualizar
color 0E

echo.
echo  ==========================================
echo   LABORATORIO SFA - Actualizar aplicacion
echo  ==========================================
echo.
echo  IMPORTANTE: cerrar primero la ventana de la app si esta corriendo.
echo.
pause

cd /d "%~dp0"

echo  Descargando ultima version...
git pull

echo  Instalando dependencias...
call npm install

echo  Actualizando base de datos (sin borrar datos)...
call npx prisma db push

echo  Recompilando para produccion...
call npm run build

echo.
echo  Listo! Ya podes volver a iniciar la app con iniciar-servidor.bat
echo.
pause
