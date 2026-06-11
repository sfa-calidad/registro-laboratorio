import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })
  return NextResponse.json(productos)
}
