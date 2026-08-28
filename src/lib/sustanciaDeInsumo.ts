import { prisma } from '@/lib/prisma'
import { unidadCompatible } from '@/lib/inventario'

/**
 * Comprueba que un insumo se pueda enlazar a la sustancia elegida. Devuelve el
 * mensaje de error, o null si está bien.
 *
 * Vive fuera de las routes porque tienen que validarlo las dos —el alta y la
 * edición—: si solo lo hiciera una, se podría crear el par incompatible por un
 * lado y arreglarlo por el otro.
 */
export async function validarSustancia(
  sustanciaId: number | null,
  unidadContenido: string | null,
): Promise<string | null> {
  if (!sustanciaId) return null

  const sustancia = await prisma.sustanciaControlada.findUnique({ where: { id: sustanciaId } })
  if (!sustancia) return 'No existe la sustancia controlada elegida'

  if (!unidadCompatible(unidadContenido, sustancia.unidad)) {
    return `El envase está medido en ${unidadContenido} y ${sustancia.nombre} se declara en ${sustancia.unidad}. Corregí la unidad del envase antes de enlazarlo.`
  }
  return null
}
