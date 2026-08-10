import { prisma } from '@/lib/prisma'
import MuestrasList from '@/components/MuestrasList'

export const dynamic = 'force-dynamic'

export default async function MuestrasPage() {
  const [muestras, productos, laboratorios, parametros, contactos, analistas] = await Promise.all([
    prisma.muestra.findMany({
      include: { ensayos: { include: { parametro: true } } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    }),
    prisma.producto.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.laboratorio.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.parametro.findMany({ where: { activo: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.contacto.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
  ])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Muestras a Laboratorio</h2>
      <MuestrasList
        muestras={muestras as Parameters<typeof MuestrasList>[0]['muestras']}
        productos={productos}
        laboratorios={laboratorios}
        parametros={parametros}
        contactos={contactos}
        analistas={analistas}
      />
    </div>
  )
}
