/**
 * Cambios de esquema que `prisma db push` no puede aplicar solo.
 *
 *  1. `PerfilProducto.contexto`: nueva columna, y el índice único pasa de
 *     (producto, parametroId) a (producto, parametroId, contexto).
 *  2. `AnalisisMateriaPrima`: de un análisis por ingreso a uno por producto del
 *     ingreso, o sea de un único sobre ingresoId a uno sobre
 *     (ingresoId, producto).
 *
 * Corre en el build ANTES de `prisma db push`. Existe porque el push aborta
 * ("data loss") cuando tiene que crear un índice único distinto sobre una tabla
 * que ya tiene filas: no sabe si hay duplicados y prefiere no arriesgarse. Esa
 * protección es deseable, así que en vez de desactivarla con
 * --accept-data-loss (que la anularía para todo, siempre), acá se hace el
 * cambio explícito. No hay duplicados posibles: el índice viejo ya garantizaba
 * que (producto, parametroId) fuera único, y todas las filas existentes quedan
 * con contexto = 'TANQUE'.
 *
 * Todo es idempotente (IF EXISTS / IF NOT EXISTS): si ya corrió, no hace nada.
 *
 * Los CREATE INDEX van dentro de un bloque que primero comprueba que la tabla
 * exista: este script corre ANTES del push, así que en una base nueva (un
 * entorno de prueba recién creado) todavía no hay tablas y un CREATE INDEX
 * suelto abortaría el build.
 *
 * Cuando estas sentencias hayan corrido en todos los entornos, se pueden sacar
 * junto con el paso del build.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Envuelve una sentencia para que solo corra si la tabla ya existe.
function siLaTablaExiste(tabla: string, sentencia: string): string {
  return `DO $$
BEGIN
  IF to_regclass('public."${tabla}"') IS NOT NULL THEN
    ${sentencia};
  END IF;
END $$;`
}

const SENTENCIAS = [
  // 1. PerfilProducto.contexto
  `ALTER TABLE IF EXISTS "PerfilProducto"
     ADD COLUMN IF NOT EXISTS "contexto" TEXT NOT NULL DEFAULT 'TANQUE'`,
  'DROP INDEX IF EXISTS "PerfilProducto_producto_parametroId_key"',
  siLaTablaExiste(
    'PerfilProducto',
    `CREATE UNIQUE INDEX IF NOT EXISTS "PerfilProducto_producto_parametroId_contexto_key"
       ON "PerfilProducto" ("producto", "parametroId", "contexto")`
  ),

  // 2. Un análisis de materia prima por producto del ingreso. Duplicados no
  //    puede haber: el único viejo ya garantizaba uno solo por ingreso.
  'DROP INDEX IF EXISTS "AnalisisMateriaPrima_ingresoId_key"',
  siLaTablaExiste(
    'AnalisisMateriaPrima',
    `CREATE UNIQUE INDEX IF NOT EXISTS "AnalisisMateriaPrima_ingresoId_producto_key"
       ON "AnalisisMateriaPrima" ("ingresoId", "producto")`
  ),
  siLaTablaExiste(
    'AnalisisMateriaPrima',
    `CREATE INDEX IF NOT EXISTS "AnalisisMateriaPrima_ingresoId_idx"
       ON "AnalisisMateriaPrima" ("ingresoId")`
  ),
]

async function main() {
  for (const sql of SENTENCIAS) {
    await prisma.$executeRawUnsafe(sql)
  }
  console.log('Migración de esquema completada')
}

main()
  .catch((e) => {
    console.error('Error migrando el esquema:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
