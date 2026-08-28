import { prisma } from '@/lib/prisma'
import { getRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MinimosInsumos from '@/components/MinimosInsumos'

export const dynamic = 'force-dynamic'

export default async function MinimosPage() {
  // Fijar mínimos es política de compras: la misma puerta que editar un insumo.
  if ((await getRole()) !== 'supervisor') redirect('/insumos')

  const [insumos, ubicaciones] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        presentacion: true,
        categoria: true,
        ubicacion: true,
        stock: true,
        stockMinimo: true,
        seControla: true,
      },
    }),
    prisma.ubicacionInsumo.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Stock mínimo</h2>
        <Link href="/insumos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a insumos
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Debajo del mínimo, el insumo aparece como faltante y se crea sola una tarea de reposición en
        el tablero. Sin mínimo cargado el aviso recién salta cuando llega a cero, que suele ser
        tarde. No hace falta ponerle a todo: alcanza con lo que no puede faltar.
      </p>
      <MinimosInsumos insumos={insumos} ubicaciones={ubicaciones} />
    </div>
  )
}
