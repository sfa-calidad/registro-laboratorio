import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { normalizarUbicacion } from '@/lib/inventario'

const schema = z.object({ nombre: z.string().min(1) })

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const ubicaciones = await prisma.ubicacionInsumo.findMany({
    where: all ? undefined : { activo: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(ubicaciones)
}

export async function POST(req: NextRequest) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede gestionar ubicaciones' }, { status: 403 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // Se normaliza también acá y no solo al importar: si no, la app vuelve a
  // acumular las mismas 19 variantes de 16 lugares que tenía la planilla.
  const nombre = normalizarUbicacion(parsed.data.nombre)
  if (!nombre) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const existente = await prisma.ubicacionInsumo.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } },
  })
  if (existente) {
    // Reactivar una dada de baja es lo que se espera al volver a escribirla.
    if (!existente.activo) {
      const revivida = await prisma.ubicacionInsumo.update({
        where: { id: existente.id },
        data: { activo: true },
      })
      return NextResponse.json(revivida)
    }
    return NextResponse.json(existente)
  }

  const ultima = await prisma.ubicacionInsumo.findFirst({ orderBy: { orden: 'desc' } })
  const ubicacion = await prisma.ubicacionInsumo.create({
    data: { nombre, orden: (ultima?.orden ?? 0) + 1 },
  })
  return NextResponse.json(ubicacion, { status: 201 })
}
