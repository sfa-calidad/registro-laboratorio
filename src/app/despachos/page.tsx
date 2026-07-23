import { prisma } from '@/lib/prisma'
import DespachosList from '@/components/DespachosList'

export const dynamic = 'force-dynamic'

export default async function DespachosPage() {
  // fecha desc con id desc como desempate estable: los más nuevos arriba y,
  // ante misma fecha, un orden fijo para que editar un registro no lo reordene.
  const despachos = await prisma.despacho.findMany({ orderBy: [{ fecha: 'desc' }, { id: 'desc' }] })
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Despachos</h2>
      <DespachosList despachos={despachos} productos={productos} />
    </div>
  )
}
