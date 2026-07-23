import { prisma } from '@/lib/prisma'
import IngresosList from '@/components/IngresosList'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  // fecha desc con id desc como desempate estable: los más nuevos arriba y,
  // ante misma fecha, un orden fijo para que editar un registro no lo reordene.
  const ingresos = await prisma.ingreso.findMany({ orderBy: [{ fecha: 'desc' }, { id: 'desc' }] })
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Ingresos</h2>
      <IngresosList ingresos={ingresos} productos={productos} />
    </div>
  )
}
