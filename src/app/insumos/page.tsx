import { prisma } from '@/lib/prisma'
import { getRole } from '@/lib/auth'
import Link from 'next/link'
import InsumosList from '@/components/InsumosList'

export const dynamic = 'force-dynamic'

export default async function InsumosPage() {
  const [insumos, ubicaciones, sustancias, analistas, role] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      include: { sustancia: true },
      orderBy: [{ nombre: 'asc' }],
    }),
    prisma.ubicacionInsumo.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.sustanciaControlada.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.analista.findMany({
      where: { activo: true },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    }),
    getRole(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Insumos</h2>
        <div className="flex gap-2">
          <Link
            href="/insumos/recuento"
            className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"
          >
            Recuento físico
          </Link>
          {role === 'supervisor' && (
            <Link
              href="/insumos/precursores"
              className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"
            >
              Precursores
            </Link>
          )}
        </div>
      </div>
      <InsumosList
        insumos={insumos}
        ubicaciones={ubicaciones}
        sustancias={sustancias}
        analistas={analistas}
        esSupervisor={role === 'supervisor'}
      />
    </div>
  )
}
