<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto del proyecto

App de gestión de laboratorio (SFA). Ver `README.md` para el panorama completo.
Resumen para trabajar en el código:

- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Prisma sobre
  PostgreSQL (Neon en prod), Tailwind 4. Electron en `desktop/`.
- **Auth**: por contraseña, roles `supervisor` / `analista`. La sesión es una
  cookie (`lab_session`) con vencimiento embebido, validada en `src/lib/auth.ts`
  y en el proxy `src/proxy.ts`. Configurable con `SESSION_HOURS`.
- **Dominio**: `Ingreso`, `Despacho`, `Tarea` (Kanban con campo `orden`),
  `ColumnaKanban`, `Rotulo`, `Contacto`, `Analista`, `Producto`, `Configuracion`
  (ver `prisma/schema.prisma`). Las páginas server-component consultan Prisma
  directo; hay APIs en `src/app/api/*` para las mutaciones del cliente.
- **Análisis de tanques y muestras**: dos módulos independientes que solo
  comparten el catálogo `Parametro` (el método es parte de la identidad del
  ensayo: "Humedad · Termobalanza" y "Humedad · Karl Fischer" nunca se fusionan).
  Tanques: `AnalisisTanque` + `ResultadoTanque`, con `PerfilProducto` (qué
  parámetros mostrar) y `Especificacion` (rangos). Muestras: `Muestra` +
  `MuestraEnsayo`, con `Laboratorio` y `LugarMuestreo`. El informe descargable
  (PDF vía `window.print()`, PNG vía SVG→canvas) vive en `src/lib/informe.ts`.

## Convenciones aprendidas (respetar)

- **Fechas-calendario** (`fecha`, `fechaVencimiento`): se guardan como medianoche
  UTC. Para mostrarlas usar `formatDateOnly` (componentes UTC), NO `formatDate`,
  que es solo para timestamps reales (`createdAt`, `completadaAt`). Ver
  `src/lib/utils.ts`.
- **Orden de listas**: ingresos/despachos ordenan por `[{ fecha: 'desc' }, { id:
  'desc' }]` para que editar no reordene. Tareas por `[{ orden }, { createdAt }]`.
- **App de escritorio (Electron)**: no usar `alert()`/`confirm()` nativos en
  flujos con foco (rompen la ventana); usar avisos in-app. La impresión de
  rótulos usa ZPL crudo por spooler para Zebra (`desktop/main.js`, `src/lib/zpl.ts`).
- **Rótulos**: el contenido de cada tipo se define una sola vez en `labelRows`
  (`src/lib/zpl.ts`) y lo renderizan las dos salidas: ZPL para la Zebra y HTML
  para el diálogo de impresión (`src/lib/etiqueta.ts`). `imprimirEtiqueta`
  (`src/lib/impresion.ts`) elige el camino según haya o no app de escritorio.
  En ZPL cada fila es de una línea: si el valor no entra se le achica la letra
  (hasta 16) en vez de cortarlo. El rótulo de calado (`RotuladorCalado`) se
  imprime sin guardar nada: es solo la etiqueta del envase.
- **Los dos modos de impresión** (`ModoImpresion` en `src/lib/impresion.ts`):
  con `'zpl'` se manda ZPL crudo al spooler (rápido y nítido, pero la Zebra
  dibuja solo lo que el ZPL describe: sin logo); con `'diseno'` no se manda ZPL
  y la app de escritorio imprime el HTML como gráfico, igual que la vista
  previa. En el navegador no aplica: siempre va por el diálogo.
- **Datos base** (productos, columnas, contactos/razones sociales, parámetros,
  perfiles, laboratorios, lugares de muestreo): se cargan en `prisma/seed.ts`,
  que corre en cada deploy de forma idempotente.
- **Numeración de muestras**: `proximoNumero()` en `src/lib/muestras.ts` arma
  `AA` + secuencia de 3 dígitos. `PRIMERA_SECUENCIA` fija el piso de los años
  que ya venían numerados en la planilla de Excel (2026 arranca en `26300`);
  el piso solo empuja hacia adelante, nunca devuelve un número existente.
- **Nombres de ensayos**: hay ensayos que parecen otra cosa. `27/3` no es una
  fecha: es la dilución de 3 ml de Bio en 27 ml de metanol para detectar aceite
  (transparente = OK, precipita = no OK). No "corregir" ni parsear estos nombres.

## Notas de mantenimiento

- **Deploy**: Vercel despliega solo al mergear a la rama por defecto
  (`claude/charming-brown-mrqmvi`; no existe `main`). Commitear a una rama de
  trabajo no despliega nada.
- **Instalador de escritorio**: el `.exe` solo hay que regenerarlo cuando cambia
  algo dentro de `desktop/`. Todo lo demás es web y le llega al usuario con el
  deploy, sin reinstalar.
- **Borrar una columna o tabla con datos**: `prisma db push` aborta con "data
  loss" y el deploy falla. Esa protección es deseable (evita que un cambio de
  esquema se lleve puestos datos reales), así que la salida no es
  `--accept-data-loss`: hay que agregar un paso previo al build que ejecute el
  `DROP`/`ALTER ... DROP COLUMN` explícito con `IF EXISTS`, y sacarlo una vez que
  corrió en todos los entornos. Se hizo así para `Motivo` y `punto`; el script
  ya cumplió y se eliminó. Por eso `Ingreso.fechaAnalisis` sigue en el esquema
  aunque no se use: sacarlo requiere ese paso.
- **Tests**: `npm test` corre el runner incorporado de Node sobre `tests/`, sin
  dependencias extra. Cubre las funciones puras donde aparecieron bugs (firma de
  la sesión, estado de las muestras, fechas del laboratorio, rótulos). Si tocás
  una de esas, el test tiene que fallar antes de que lo arregles.
