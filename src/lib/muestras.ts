import { prisma } from '@/lib/prisma'

// Deriva el estado de una muestra cuando el usuario no lo manda explícito.
//
// Con laboratorio interno el protocolo ES el número de muestra y lo completa la
// API sola. Ese protocolo autogenerado NO puede contar como señal de que hay
// resultado, y hay que descartarlo en los dos momentos:
//
//  1. En el alta, evaluando antes de autocompletarlo.
//  2. En cada edición posterior, porque el protocolo ya quedó guardado, el
//     formulario lo recarga y lo reenvía. Sin este descarte, abrir una muestra
//     interna para corregir una observación y guardarla la movía sola a
//     CON_RESULTADO sin resultado ni fecha de resultado, y desaparecía del
//     seguimiento de pendientes.
export function derivarEstado(datos: {
  numero?: string | null
  fechaResultado?: string | null
  resultado?: string | null
  protocolo?: string | null
  fechaEnvio?: string | null
  labEsExterno: boolean | null // null = laboratorio no indicado o desconocido
}): string {
  const protocoloAutogenerado =
    datos.labEsExterno === false &&
    !!datos.protocolo &&
    !!datos.numero &&
    datos.protocolo.trim() === datos.numero.trim()
  const hayProtocoloCargado = !!datos.protocolo && !protocoloAutogenerado

  if (datos.fechaResultado || datos.resultado || hayProtocoloCargado) return 'CON_RESULTADO'
  if (datos.fechaEnvio && datos.labEsExterno === true) return 'ENVIADA'
  if (datos.labEsExterno === false) return 'EN_ANALISIS'
  return 'IDENTIFICADA'
}

// Piso de la serie para años que ya venían numerados fuera del sistema. Las
// muestras de 2026 hasta la 26299 se cargaron en la planilla de Excel y no
// están en esta base, así que la app tiene que arrancar en la 26300 para no
// pisarlas. Un año que no figure acá arranca en 000.
const PRIMERA_SECUENCIA: Record<string, number> = { '26': 300 }

// Serie del número de muestra: 2 dígitos del año + 3 (o más) de secuencia.
// La primera del año es AA000 (p. ej. "27000"), salvo que PRIMERA_SECUENCIA
// fije otro piso. Si hay números fuera de formato (importados viejos), se
// ignoran para el cálculo.
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
  const piso = PRIMERA_SECUENCIA[prefijo] ?? 0
  // El piso solo empuja hacia adelante: si ya hay una muestra más alta cargada,
  // manda esa. Nunca devuelve un número que ya exista.
  const siguiente = Math.max(piso, secuencias.length ? Math.max(...secuencias) + 1 : 0)
  return prefijo + String(siguiente).padStart(3, '0')
}
