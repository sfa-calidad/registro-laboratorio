import { prisma } from '@/lib/prisma'
import EstadisticasView from '@/components/EstadisticasView'

export const dynamic = 'force-dynamic'

export default async function EstadisticasPage() {
  const [analistas, tareas, ingresos, despachos] = await Promise.all([
    prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    prisma.tarea.findMany({ include: { firma1: true, firma2: true, columna: true } }),
    prisma.ingreso.findMany({ select: { operador: true, createdAt: true } }),
    prisma.despacho.findMany({ select: { operador: true, createdAt: true } }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estadísticas</h1>
        <p className="text-sm text-gray-500">Actividad de analistas y movimientos</p>
      </div>
      <EstadisticasView
        analistas={analistas}
        tareas={tareas as Parameters<typeof EstadisticasView>[0]['tareas']}
        ingresos={ingresos}
        despachos={despachos}
      />
    </div>
  )
}
