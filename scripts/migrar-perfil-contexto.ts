/**
 * Agrega `PerfilProducto.contexto` y cambia el índice único de
 * (producto, parametroId) a (producto, parametroId, contexto).
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
 * Cuando estas sentencias hayan corrido en todos los entornos, se pueden sacar
 * junto con el paso del build.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SENTENCIAS = [
  `ALTER TABLE IF EXISTS "PerfilProducto"
     ADD COLUMN IF NOT EXISTS "contexto" TEXT NOT NULL DEFAULT 'TANQUE'`,
  'DROP INDEX IF EXISTS "PerfilProducto_producto_parametroId_key"',
  `CREATE UNIQUE INDEX IF NOT EXISTS "PerfilProducto_producto_parametroId_contexto_key"
     ON "PerfilProducto" ("producto", "parametroId", "contexto")`,
]

async function main() {
  for (const sql of SENTENCIAS) {
    await prisma.$executeRawUnsafe(sql)
  }
  console.log('Migración de PerfilProducto.contexto completada')
}

main()
  .catch((e) => {
    console.error('Error migrando PerfilProducto.contexto:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
