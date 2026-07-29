import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// Traduce los errores conocidos de Prisma a respuestas con sentido. Sin esto,
// borrar algo que ya no existe (doble clic, una pestaña vieja) devolvía un 500
// con el stack en vez de un 404, y chocar contra un único devolvía 500 en vez
// de 409.
export function respuestaDeErrorPrisma(e: unknown): NextResponse | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null

  switch (e.code) {
    case 'P2025': // no existe el registro
      return NextResponse.json({ error: 'No se encontró el registro' }, { status: 404 })
    case 'P2002': // choca con un índice único
      return NextResponse.json({ error: 'Ya existe un registro con esos datos' }, { status: 409 })
    case 'P2003': // lo referencia otro registro
      return NextResponse.json({ error: 'No se puede eliminar: hay registros que dependen de este' }, { status: 409 })
    default:
      return null
  }
}

// Envuelve el cuerpo de un handler. Lo que no sea un error conocido de Prisma
// se vuelve a lanzar, para no tapar bugs de verdad.
export async function conManejoDeErrores(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e) {
    const respuesta = respuestaDeErrorPrisma(e)
    if (respuesta) return respuesta
    throw e
  }
}
