import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') return NextResponse.json({ error: 'Solo el supervisor puede gestionar contactos' }, { status: 403 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.contacto.delete({ where: { id: idNum } })
    return NextResponse.json({ ok: true })
  })
}
