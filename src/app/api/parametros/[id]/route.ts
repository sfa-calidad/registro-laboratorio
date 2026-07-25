import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'

// Baja lógica: un parámetro puede estar referenciado por resultados de tanques
// y ensayos de muestras históricos, así que nunca se borra físicamente.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  await prisma.parametro.update({ where: { id: Number(id) }, data: { activo: false } })
  return NextResponse.json({ ok: true })
}
