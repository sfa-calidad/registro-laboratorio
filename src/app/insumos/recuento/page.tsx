import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RecuentoInsumos from '@/components/RecuentoInsumos'

export const dynamic = 'force-dynamic'

export default async function RecuentoPage() {
  const [insumos, ubicaciones, analistas] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        presentacion: true,
        ubicacion: true,
        stock: true,
        seControla: true,
        ultimoRecuento: true,
      },
    }),
    prisma.ubicacionInsumo.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.analista.findMany({
      where: { activo: true },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Recuento físico</h2>
        <Link href="/insumos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a insumos
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Elegí una ubicación y recorrela anotando lo que contás. Lo que no coincida queda registrado
        como ajuste con tu nombre y la fecha; lo que coincida también queda marcado como contado.
        Las filas que dejes en blanco no mueven nada.
      </p>
      <RecuentoInsumos insumos={insumos} ubicaciones={ubicaciones} analistas={analistas} />
    </div>
  )
}
