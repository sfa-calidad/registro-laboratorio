import { NextResponse } from 'next/server'
import { getRole } from '@/lib/auth'

export async function GET() {
  const role = await getRole()
  if (!role) return NextResponse.json({ role: null }, { status: 401 })
  return NextResponse.json({ role })
}
