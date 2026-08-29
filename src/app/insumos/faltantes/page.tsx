import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { faltantes } from '@/lib/faltantes'
import FaltantesInsumos from '@/components/FaltantesInsumos'

export const dynamic = 'force-dynamic'

export default async function FaltantesPage() {
  // Solo lo que se controla: lo que se pide a pañol o nunca se contó no entra en
  // un pedido de reposición, aunque figure en cero.
  const insumos = await prisma.insumo.findMany({
    where: { activo: true, seControla: true },
    orderBy: [{ nombre: 'asc' }],
    select: {
      id: true, nombre: true, presentacion: true, categoria: true,
      ubicacion: true, stock: true, stockMinimo: true, seControla: true,
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Insumos a reponer</h2>
        <Link href="/insumos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a insumos
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Todo lo que está en cero o por debajo de su mínimo, calculado en este momento. Primero lo
        que se agotó, que frena un ensayo hoy. Se puede imprimir para pasarle a compras, bajar como
        planilla, o llevar al tablero como una sola tarea con la lista adentro.
      </p>
      <FaltantesInsumos filas={faltantes(insumos)} />
    </div>
  )
}
