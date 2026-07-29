# Registro Laboratorio SFA

Sistema web de gestión de movimientos para el laboratorio de SFA: registro de
**ingresos** y **despachos**, **tablero de tareas** (Kanban), generación e
impresión de **rótulos/etiquetas** (incluida impresión directa a impresoras
Zebra) y un **dashboard** con estadísticas. Los datos viven en una base central
en la nube, así que todos ven la misma información en tiempo real.

## Roles y acceso

El acceso es por contraseña, con dos roles:

- **Analista**: carga y edita ingresos, despachos, rótulos y tareas.
- **Supervisor**: además gestiona analistas, contactos (proveedores/clientes),
  archiva tareas completadas y ve las estadísticas del dashboard.

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
```

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
