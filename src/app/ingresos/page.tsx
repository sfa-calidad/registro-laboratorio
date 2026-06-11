import { prisma } from '@/lib/prisma'
import IngresosList from '@/components/IngresosList'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  const ingresos = await prisma.ingreso.findMany({ orderBy: { fecha: 'desc' } })
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Ingresos</h2>
      <IngresosList ingresos={ingresos} productos={productos} />
    </div>
  )
}
