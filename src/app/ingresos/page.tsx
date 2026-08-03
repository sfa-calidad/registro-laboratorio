import { prisma } from '@/lib/prisma'
import IngresosList from '@/components/IngresosList'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  const [ingresos, productos, parametros, perfiles, analistas] = await Promise.all([
    // fecha desc con id desc como desempate estable: los más nuevos arriba y,
    // ante misma fecha, un orden fijo para que editar un registro no lo reordene.
    prisma.ingreso.findMany({
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      include: { analisis: { include: { resultados: true } } },
    }),
    prisma.producto.findMany({ orderBy: { nombre: 'asc' } }),
    // El catálogo de ensayos es el mismo que usa el análisis de tanque; los
    // perfiles no: el camión que entra lleva más ensayos que el control de
    // tanque, por eso el perfil va por contexto. Los rangos tampoco salen del
    // catálogo: se escriben al cargar el análisis, porque cada orden de compra
    // trae los suyos en la planilla de coordinación.
    prisma.parametro.findMany({ where: { activo: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.perfilProducto.findMany({ where: { contexto: 'MATERIA_PRIMA' }, orderBy: { orden: 'asc' } }),
    prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
  ])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Ingresos</h2>
      <IngresosList
        ingresos={ingresos}
        productos={productos}
        parametros={parametros}
        perfiles={perfiles}
        analistas={analistas}
      />
    </div>
  )
}
