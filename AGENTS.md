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
  (PDF vía `window.print()`, PNG vía SVG→canvas) vive en `src/lib/informe.ts` y
  lo muestra `VisorInforme` (pantalla + copiar/compartir/descargar), compartido
  por tanques y materia prima.
- **Análisis de materia prima**: el camión que entra se analiza y se informa en
  el momento. `AnalisisMateriaPrima` + `ResultadoMateriaPrima` cuelgan del
  `Ingreso` ya cargado (uno por ingreso), así que origen, HR/remito y producto no
  se retipean. Reusa `Parametro`; el perfil no (el mismo producto lleva más
  ensayos en el camión que en el tanque, por eso `PerfilProducto.contexto` es
  `TANQUE` o `MATERIA_PRIMA`) y la especificación tampoco: los límites se
  escriben al cargar el análisis y se guardan en `ResultadoMateriaPrima.specMin`
  / `specMax`, porque cada orden de compra trae los suyos en la planilla de
  coordinación. `Especificacion` quedó solo para tanques. Los desvíos van en una
  banda roja arriba del informe (`InformeTanque.desvios`), porque el informe se
  manda como foto y tiene que leerse sin buscar en la tabla.

## Interfaz

Los colores, los tamaños de texto, las clases de cada componente y cómo se
construyen los informes (HTML para imprimir y SVG para imagen) están en
**`docs/ESTILOS.md`**. Antes de escribir una pantalla o un informe nuevo,
copiar de ahí en vez de inventar una variante.

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
  con `'zpl'` se manda ZPL crudo al spooler, sin diálogo (rápido y nítido, pero
  la Zebra dibuja solo lo que el ZPL describe: sin logo); con `'diseno'` se abre
  el diálogo con el HTML, igual que "Imprimir rótulo" de los movimientos, y sale
  con logo. **No usar la impresión silenciosa de Chromium para el diseño**: en
  Windows el driver de la Zebra la rechaza con "Invalid printer settings"
  (electron#39092). Ya se probó y falla; el diálogo funciona.
- **Datos base** (productos, columnas, contactos/razones sociales, parámetros,
  perfiles, laboratorios, lugares de muestreo): se cargan en `prisma/seed.ts`,
  que corre en cada deploy de forma idempotente.
- **La materia grasa no se mide, se calcula**: `100 − mayor(insolubles) −
  humedad`, la fórmula que está anotada en el Excel del laboratorio. Está en
  `src/lib/calculos.ts` con los siete bloques reales de la planilla como test.
  Si hay dos humedades cargadas (KF y termobalanza) se usa la mayor.
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
- **Cambios de esquema que `prisma db push` no aplica solo**: borrar una columna
  o tabla con datos, y también **cambiar un índice único** sobre una tabla que ya
  tiene filas (no puede saber si hay duplicados). En los dos casos el push aborta
  con "data loss" y el deploy falla. Esa protección es deseable (evita que un
  cambio de esquema se lleve puestos datos reales), así que la salida no es
  `--accept-data-loss`: hay que agregar un paso previo al build que ejecute el
  `DROP`/`ALTER`/`CREATE INDEX` explícito con `IF EXISTS` / `IF NOT EXISTS`, y
  sacarlo una vez que corrió en todos los entornos. Se hizo así para `Motivo` y
  `punto` (ese script ya cumplió y se eliminó) y para `PerfilProducto.contexto`
  (`scripts/migrar-perfil-contexto.ts`, todavía en el build).
- **Los informes se leen en el celular**: la imagen se manda por WhatsApp, así
  que lo que decide si se lee sin zoom es el tamaño de la letra **relativo al
  ancho** de la imagen (`fuente × 390 / ancho`). Por eso el SVG mide 560 px de
  ancho con cuerpo de 18 y piso de 16, y sale en 4:5 (lo más alto que WhatsApp
  muestra entero) rellenando con blanco cuando el contenido no llega; si lo pasa
  se deja crecer, porque ensancharlo para forzar la proporción achicaría la
  letra. `tests/informe.test.ts` fija eso y el contraste; ver `docs/ESTILOS.md`.
- **Tests**: `npm test` corre el runner incorporado de Node sobre `tests/`, sin
  dependencias extra. Cubre las funciones puras donde aparecieron bugs (firma de
  la sesión, estado de las muestras, fechas del laboratorio, rótulos). Si tocás
  una de esas, el test tiene que fallar antes de que lo arregles.
