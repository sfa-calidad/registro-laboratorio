import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'
import { ETIQUETA_REPOSICION, faltantes, textoDeChecklist, tituloDeTarea } from '@/lib/faltantes'

export const dynamic = 'force-dynamic'

/**
 * Lleva los faltantes al tablero como UNA tarea con la lista adentro.
 *
 * Antes esto pasaba solo, y con una tarea por insumo: en el goteo del día a día
 * funcionaba, pero un inventario completo dejaba cincuenta tarjetas de golpe y
 * tapaba el tablero. Ahora lo decide una persona, cuando la lista ya está
 * revisada, y es una sola tarjeta.
 */
export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req)
  if (!role) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  return conManejoDeErrores(async () => {
    // Una sola abierta a la vez. Es el mismo problema de antes en chico: apretar
    // el botón dos veces no tiene que dejar dos listas que después divergen.
    const abierta = await prisma.tarea.findFirst({
      where: { etiquetas: { contains: ETIQUETA_REPOSICION }, completadaAt: null, archivadaAt: null },
      orderBy: { id: 'desc' },
    })
    if (abierta) {
      return NextResponse.json(
        {
          error: `Ya hay una tarea de reposición abierta en el tablero ("${abierta.titulo}"). Cerrala o archivala antes de crear otra, así no quedan dos listas distintas.`,
        },
        { status: 409 },
      )
    }

    const insumos = await prisma.insumo.findMany({
      where: { activo: true, seControla: true },
      select: {
        id: true, nombre: true, presentacion: true, categoria: true,
        ubicacion: true, stock: true, stockMinimo: true, seControla: true,
      },
    })
    const lista = faltantes(insumos)
    if (lista.length === 0) {
      return NextResponse.json({ error: 'No hay nada para reponer' }, { status: 400 })
    }

    const columna = await prisma.columnaKanban.findFirst({ orderBy: { orden: 'asc' } })
    if (!columna) {
      return NextResponse.json({ error: 'No hay columnas en el tablero' }, { status: 400 })
    }

    const tarea = await prisma.tarea.create({
      data: {
        titulo: tituloDeTarea(lista.length),
        descripcion:
          'Generada desde el informe de faltantes de insumos. Las cantidades son las del momento en que se creó.',
        columnaId: columna.id,
        creadoPor: role,
        etiquetas: ETIQUETA_REPOSICION,
        checklist: JSON.stringify(lista.map((f) => ({ texto: textoDeChecklist(f), hecho: false }))),
        // Abierta de entrada: la lista es el contenido de la tarea, no un detalle.
        mostrarChecklist: true,
        orden: -1,
      },
    })

    return NextResponse.json({ id: tarea.id, titulo: tarea.titulo, items: lista.length }, { status: 201 })
  })
}
