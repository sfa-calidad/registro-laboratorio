import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') return NextResponse.json({ error: 'Solo el supervisor puede gestionar contactos' }, { status: 403 })
  const { id } = await params
  await prisma.contacto.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
