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
  y en el proxy `src/middleware.ts`. Configurable con `SESSION_HOURS`.
- **Dominio**: `Ingreso`, `Despacho`, `Tarea` (Kanban con campo `orden`),
  `ColumnaKanban`, `Rotulo`, `Contacto`, `Analista`, `Producto`, `Configuracion`
  (ver `prisma/schema.prisma`). Las páginas server-component consultan Prisma
  directo; hay APIs en `src/app/api/*` para las mutaciones del cliente.

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
- **Datos base** (productos, columnas, contactos/razones sociales): se cargan en
  `prisma/seed.ts`, que corre en cada deploy de forma idempotente.
