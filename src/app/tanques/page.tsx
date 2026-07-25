import { prisma } from '@/lib/prisma'
import AnalisisTanqueList from '@/components/AnalisisTanqueList'

export const dynamic = 'force-dynamic'

export default async function TanquesPage() {
  const [analisis, productos, analistas, parametros, perfiles, especificaciones] = await Promise.all([
    prisma.analisisTanque.findMany({
      include: { resultados: { include: { parametro: true } } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    }),
    prisma.producto.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    prisma.parametro.findMany({ where: { activo: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.perfilProducto.findMany({ orderBy: { orden: 'asc' } }),
    prisma.especificacion.findMany(),
  ])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Análisis de Tanques</h2>
      <AnalisisTanqueList
        analisis={analisis as Parameters<typeof AnalisisTanqueList>[0]['analisis']}
        productos={productos}
        analistas={analistas}
        parametros={parametros}
        perfiles={perfiles}
        especificaciones={especificaciones}
      />
    </div>
  )
}
