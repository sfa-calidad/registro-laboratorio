import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  empresa: 'Laboratorio SFA',
  etiquetaAncho: '100',
  etiquetaAlto: '45',
  etiquetaFuente: '9',
  operadorPredeterminado: '',
  logo: '',
}

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const configs = await prisma.configuracion.findMany()
  const result: Record<string, string> = { ...DEFAULTS }
  for (const c of configs) {
    result[c.clave] = c.valor
  }
  return NextResponse.json(result)
}

// Solo estas claves se pueden escribir, y con estos límites. Antes se aceptaba
// cualquier clave y cualquier valor: se podían crear filas sin límite, meter un
// logo de decenas de MB, o poner un ancho de etiqueta que rompía el CSS del
// rótulo y generaba ZPL con medidas negativas (la etiqueta salía en blanco sin
// ningún aviso).
const CLAVES: Record<string, { tipo: 'texto' | 'numero' | 'logo'; max?: number; min?: number }> = {
  empresa: { tipo: 'texto', max: 120 },
  etiquetaAncho: { tipo: 'numero', min: 10, max: 300 },
  etiquetaAlto: { tipo: 'numero', min: 10, max: 300 },
  etiquetaFuente: { tipo: 'numero', min: 5, max: 40 },
  operadorPredeterminado: { tipo: 'texto', max: 120 },
  logo: { tipo: 'logo', max: 2_000_000 }, // ~1,5 MB de imagen en base64
}

const LOGO_VALIDO = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/

function validar(clave: string, valor: unknown): string | { error: string } {
  const regla = CLAVES[clave]
  if (!regla) return { error: `Clave desconocida: ${clave}` }
  if (typeof valor !== 'string') return { error: `${clave} tiene que ser texto` }

  if (regla.tipo === 'numero') {
    const n = Number(valor)
    if (!Number.isFinite(n) || n < regla.min! || n > regla.max!) {
      return { error: `${clave} tiene que ser un número entre ${regla.min} y ${regla.max}` }
    }
    return String(n)
  }
  if (valor.length > regla.max!) return { error: `${clave} es demasiado largo` }
  if (regla.tipo === 'logo' && valor !== '' && !LOGO_VALIDO.test(valor.trim())) {
    return { error: 'El logo tiene que ser una imagen' }
  }
  return valor
}

export async function POST(req: NextRequest) {
  // La configuración es global (nombre de la empresa, logo, tamaño de etiqueta):
  // la cambia el supervisor, igual que los contactos y los analistas.
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede cambiar la configuración' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  // Se valida todo antes de escribir nada, para no dejar la configuración a
  // medio guardar.
  const aGuardar: [string, string][] = []
  for (const [clave, valor] of Object.entries(body as Record<string, unknown>)) {
    const resultado = validar(clave, valor)
    if (typeof resultado !== 'string') return NextResponse.json(resultado, { status: 400 })
    aGuardar.push([clave, resultado])
  }

  await prisma.$transaction(
    aGuardar.map(([clave, valor]) =>
      prisma.configuracion.upsert({ where: { clave }, update: { valor }, create: { clave, valor } })
    )
  )
  return NextResponse.json({ ok: true })
}
