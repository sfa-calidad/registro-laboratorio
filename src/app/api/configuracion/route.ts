import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  empresa: 'Laboratorio SFA',
  etiquetaAncho: '100',
  etiquetaAlto: '45',
  etiquetaFuente: '9',
  operadorPredeterminado: '',
}

export async function GET() {
  const configs = await prisma.configuracion.findMany()
  const result: Record<string, string> = { ...DEFAULTS }
  for (const c of configs) {
    result[c.clave] = c.valor
  }
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>
  for (const [clave, valor] of Object.entries(body)) {
    await prisma.configuracion.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    })
  }
  return NextResponse.json({ ok: true })
}
