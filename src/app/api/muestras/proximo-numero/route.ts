import { NextRequest, NextResponse } from 'next/server'
import { getRoleFromRequest } from '@/lib/auth'
import { proximoNumero } from '@/lib/muestras'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ numero: await proximoNumero() })
}
