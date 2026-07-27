/**
 * Limpieza de objetos de base que quedaron de versiones anteriores del esquema.
 *
 * Corre en el build ANTES de `prisma db push`. Existe porque el push aborta
 * ("data loss") cuando tiene que borrar una tabla o columna que todavía tiene
 * filas, y esa protección es deseable: evita que un cambio de esquema
 * accidental se lleve puestos datos reales del laboratorio. En vez de
 * desactivarla con --accept-data-loss (que la anularía para todo, siempre),
 * acá se borra explícitamente solo lo que se decidió eliminar.
 *
 * Todo es idempotente (IF EXISTS): si ya no está, no hace nada.
 *
 * Cuando estas sentencias hayan corrido en todos los entornos, se pueden sacar
 * junto con el paso del build.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Eliminados a pedido: el punto de extracción de los análisis de tanque y el
// motivo de las muestras (con su catálogo, que solo alimentaba ese campo).
const SENTENCIAS = [
  'DROP TABLE IF EXISTS "Motivo"',
  'ALTER TABLE IF EXISTS "Muestra" DROP COLUMN IF EXISTS "motivo"',
  'ALTER TABLE IF EXISTS "AnalisisTanque" DROP COLUMN IF EXISTS "punto"',
]

async function main() {
  for (const sql of SENTENCIAS) {
    await prisma.$executeRawUnsafe(sql)
  }
  console.log('Limpieza de esquema completada')
}

main()
  .catch((e) => {
    console.error('Error limpiando objetos obsoletos:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
