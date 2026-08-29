# Registro Laboratorio SFA

Sistema web de gestión de movimientos para el laboratorio de SFA: registro de
**ingresos** y **despachos**, **tablero de tareas** (Kanban), generación e
impresión de **rótulos/etiquetas** (incluida impresión directa a impresoras
Zebra) y un **dashboard** con estadísticas. Los datos viven en una base central
en la nube, así que todos ven la misma información en tiempo real.

## Roles y acceso

El acceso es por contraseña, con dos roles:

- **Analista**: carga y edita ingresos, despachos, análisis, muestras, rótulos y
  tareas; registra consumos y entradas de insumos, y hace recuentos.
- **Supervisor**: además gestiona analistas, contactos (proveedores/clientes),
  productos y parámetros; da de alta insumos y fija sus mínimos; ve la
  declaración de precursores; archiva tareas completadas y ve las estadísticas
  del dashboard.

Lo que un rol no puede hacer **no se le muestra**, en vez de mostrárselo
deshabilitado.

La sesión se guarda en una cookie `lab_session` **firmada con HMAC-SHA256** (rol
y vencimiento van dentro de la firma, así que no se puede fabricar una sesión ni
estirar su duración editando la cookie) y **expira sola a las 3 horas**
(configurable con `SESSION_HOURS`). El acceso a todas las páginas y APIs lo
controla `src/proxy.ts` (el proxy de Next.js, antes "middleware").

La clave de firma sale de `SESSION_SECRET` si está definida y, si no, se deriva
de las contraseñas: no hace falta configurar nada. Cambiar cualquiera de las dos
contraseñas invalida las sesiones abiertas.

## Funcionalidades

- **Ingresos / Despachos**: alta, edición, duplicado, borrado, búsqueda y
  exportación a CSV. Listas **paginadas** (15 por página), ordenadas con los más
  nuevos arriba y con posición estable (editar un registro no lo reordena).
- **Tareas (Kanban)**: columnas configurables, prioridad, vencimiento,
  etiquetas, notas, checklist y firmas. Las tarjetas se **arrastran para mover
  entre columnas y reordenar dentro de una columna** (se acomodan donde se
  sueltan). Pasar una tarea a "Completado" exige al menos una firma.
- **Análisis de tanques**: control de lo que hay en los tanques de planta. Un
  análisis puede cubrir varios tanques, y la altura siempre va con su referencia
  (AF/DS/AC), porque 2 m desde el fondo y 2 m desde la superficie no son el
  mismo punto. Lo que se va de especificación se marca, pero no bloquea.
- **Análisis de materia prima**: el camión que entra se analiza desde su propio
  ingreso, sin retipear origen ni remito, y se informa en el momento. Va uno por
  producto del ingreso, y los límites se escriben al cargarlo porque cada orden
  de compra trae los suyos.
- **Muestras a laboratorio**: identificación y seguimiento de toda muestra que
  entra, salga o no a un laboratorio externo. El número lo pone el sistema y el
  estado se calcula solo a partir de lo que se va cargando.
- **Informes**: se ven en pantalla y se bajan como PDF o como imagen. La imagen
  está armada para leerse en un celular sin agrandar, porque se manda por
  WhatsApp.
- **Insumos**: inventario de reactivos y material de vidrio. **El stock es el
  saldo de un registro de movimientos**, no un número que se pisa: cada
  movimiento deja quién, cuándo, por qué y el saldo antes y después. Incluye
  recuento físico por ubicación con planilla imprimible, stock mínimo, lista de
  faltantes para compras y la declaración de precursores químicos
  (RENPRE/SEDRONAR) calculada desde los movimientos.
- **Rótulos**: se generan desde ingresos/despachos y se imprimen. En la **app de
  escritorio** hay impresión rápida directa a la impresora elegida (para Zebra
  se envía ZPL nativo al spooler, sin diálogo).
- **Dashboard**: totales, movimientos del día, últimos registros, tareas
  pendientes/vencidas y estadísticas por analista (solo supervisor).
- **Configuración**: datos de la empresa, logo, medidas de etiqueta, productos,
  columnas del tablero y —solo supervisor— contactos y analistas.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma** ORM sobre **PostgreSQL** (Neon en producción)
- **Tailwind CSS 4**
- **Electron** para la app de escritorio (carpeta `desktop/`)

La paleta, la tipografía, las clases de cada componente y cómo se construyen los
informes están documentados en [`docs/ESTILOS.md`](docs/ESTILOS.md).

El manual de uso para analistas y supervisores está en
[`docs/manual/manual.html`](docs/manual/manual.html); el PDF lo arma
`node docs/manual/generar.js`, que toma las capturas de la carpeta que se le
pase (por defecto `<Escritorio>/capturas-manual`) y usa el Edge o el Chrome ya
instalados. Las convenciones y las decisiones de diseño del código están en
[`AGENTS.md`](AGENTS.md).

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (obligatoria). |
| `SUPERVISOR_PASSWORD` | Contraseña del rol supervisor. |
| `ANALISTA_PASSWORD` | Contraseña del rol analista. |
| `APP_PASSWORD` | Alternativa única para ambos roles (compatibilidad). |
| `SESSION_HOURS` | Duración de la sesión en horas (por defecto 3). |
| `SESSION_SECRET` | Clave para firmar la cookie de sesión. Opcional: si falta, se deriva de las contraseñas. |
| `TZ` | Zona horaria del servidor. Conviene `America/Argentina/Buenos_Aires`. |

> **Sobre `TZ`.** El servidor de Vercel corre en UTC, tres horas adelante de la
> planta: a partir de las 21:00 hora argentina el proceso ya está en el día
> siguiente. Los cálculos de "hoy", "este mes" y "este año" no dependen de esto
> (van anclados a la zona del laboratorio en `src/lib/utils.ts`), pero definir
> `TZ` hace que además los horarios que se muestran en pantalla y en los CSV
> sean los de acá y no los de Greenwich.

## Desarrollo local

```bash
npm install
# definir DATABASE_URL y las contraseñas (por ejemplo en un archivo .env)
npx prisma db push   # crea/actualiza el esquema en la base
npm run dev          # http://localhost:3000
npm test             # tests de las funciones puras
npm run lint
```

Los mismos tres comandos (`test`, `lint`, `build:local`) corren solos en cada
push y cada pull request; ver `.github/workflows/ci.yml`.

## Deploy (Vercel + Neon)

El deploy es automático en Vercel al mergear a la rama principal. El script de
build corre por sí solo:

```
prisma generate && prisma db push --skip-generate && prisma db seed && next build
```

Es decir, **cada deploy sincroniza el esquema (`prisma db push`) y siembra los
datos base (`prisma db seed`) contra la base de producción** — no hay que
correr nada de Prisma a mano. Las variables de entorno se configuran en Vercel.

## App de escritorio (Windows)

La carpeta `desktop/` empaqueta la web como una aplicación de Windows (Electron).
Es un envoltorio de la app publicada: mismos datos, requiere internet. Habilita
la impresión rápida de rótulos y cierra la sesión al cerrarse. Ver
[`desktop/README.md`](desktop/README.md) para configurarla y generar el
instalador.
