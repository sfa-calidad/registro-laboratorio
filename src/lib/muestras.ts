import { prisma } from '@/lib/prisma'

// Deriva el estado de una muestra cuando el usuario no lo manda explícito.
// Importante: se evalúa sobre lo que cargó el usuario, ANTES de autocompletar
// el protocolo para laboratorios internos — si no, toda muestra interna
// nacería CON_RESULTADO por su propio protocolo autogenerado.
export function derivarEstado(datos: {
  fechaResultado?: string | null
  resultado?: string | null
  protocolo?: string | null
  fechaEnvio?: string | null
  labEsExterno: boolean | null // null = laboratorio no indicado o desconocido
}): string {
  if (datos.fechaResultado || datos.resultado || datos.protocolo) return 'CON_RESULTADO'
  if (datos.fechaEnvio && datos.labEsExterno === true) return 'ENVIADA'
  if (datos.labEsExterno === false) return 'EN_ANALISIS'
  return 'IDENTIFICADA'
}

// Serie del número de muestra: 2 dígitos del año + 3 (o más) de secuencia.
// La primera del año es AA000 (p. ej. "26000"). Si hay números fuera de
// formato (importados viejos), se ignoran para el cálculo.
export async function proximoNumero(): Promise<string> {
  const prefijo = String(new Date().getFullYear()).slice(-2)
  const delAnio = await prisma.muestra.findMany({
    where: { numero: { startsWith: prefijo } },
    select: { numero: true },
  })
  const secuencias = delAnio
    .map((m) => m.numero)
    .filter((n) => new RegExp(`^${prefijo}\\d{3,}$`).test(n))
    .map((n) => parseInt(n.slice(2), 10))
  const siguiente = secuencias.length ? Math.max(...secuencias) + 1 : 0
  return prefijo + String(siguiente).padStart(3, '0')
}
