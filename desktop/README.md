# Registro Laboratorio SFA — App de escritorio (Windows)

Este subproyecto empaqueta la aplicación web (ya publicada) como un programa de
Windows con instalador `.exe`. Por dentro abre la misma app en la nube, así que
**todos siguen viendo los mismos datos** (base central en Neon). Requiere internet.

## 1. Configurar la dirección de la app (obligatorio)

Editá `config.json` y poné la URL real de tu app publicada:

```json
{
  "appUrl": "https://tu-app.vercel.app"
}
```

## 2. Ícono (opcional pero recomendado)

Poné un ícono en `build/icon.ico` (formato `.ico`, idealmente 256×256).
Si no ponés ninguno, se usa el ícono por defecto de Electron.

## 3a. Generar el instalador SIN tener una PC con Windows (recomendado)

El repositorio incluye un flujo de GitHub Actions que compila el `.exe` en un
runner de Windows de GitHub:

1. En GitHub, entrá a la pestaña **Actions**.
2. Elegí el workflow **"Build desktop (.exe)"** → **Run workflow**.
3. Cuando termine, descargá el artefacto **registro-laboratorio-instalador**
   (adentro está el `.exe` del instalador).

## 3b. Generar el instalador desde una PC con Windows

```bash
cd desktop
npm install
npm run dist
```

El instalador queda en `desktop/dist/` (por ejemplo
`Registro Laboratorio SFA Setup 1.0.0.exe`).

- `npm run dist` → instalador NSIS (el usuario hace "Siguiente, Siguiente,
  Instalar", crea acceso directo en escritorio y menú inicio).
- `npm run dist:portable` → un único `.exe` portable, sin instalación.

## 4. Probar en modo desarrollo

```bash
cd desktop
npm install
npm start
```

## Notas

- Es un envoltorio de la app web: no incluye base de datos local. Los datos
  viven en la base central en la nube, igual que en el navegador.
- Al cerrar la aplicación se cierra la sesión automáticamente (se borran las
  cookies), así que al abrirla de nuevo siempre pide la contraseña.
- Para cambiar a qué servidor apunta, basta con editar `config.json` y volver a
  generar el instalador (o definir la variable de entorno `APP_URL`).
