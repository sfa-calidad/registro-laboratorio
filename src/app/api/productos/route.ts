import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })
  return NextResponse.json(productos)
}

export async function POST(req: NextRequest) {
  const { nombre } = await req.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const producto = await prisma.producto.create({ data: { nombre: nombre.trim() } })
  return NextResponse.json(producto, { status: 201 })
}
