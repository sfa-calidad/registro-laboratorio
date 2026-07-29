import { prisma } from '@/lib/prisma'
import { formatDateOnly, hoyEnLaboratorio, sumarDias } from '@/lib/utils'
import { getRole } from '@/lib/auth'
import EstadisticasView from '@/components/EstadisticasView'
import NotasTablero from '@/components/NotasTablero'

export const dynamic = 'force-dynamic'

// Período más largo que ofrece el selector de estadísticas. Tiene que coincidir
// con el mayor de PERIODOS en src/components/EstadisticasView.tsx.
const PERIODO_MAX_DIAS = 365

export default async function Dashboard() {
  // "Hoy" es el día del laboratorio, no el del proceso: en Vercel el servidor
  // corre en UTC y a partir de las 21:00 hora argentina ya está en el día
  // siguiente, así que las tarjetas de "hoy" cambiaban a media tarde.
  const hoy = hoyEnLaboratorio()
  const manana = sumarDias(hoy, 1)
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))

  const role = await getRole()

  // Las tareas archivadas no cuentan como pendientes ni como vencidas: el
  // tablero ya las esconde, pero acá seguían sumando para siempre si se
  // archivaba una tarea que nunca se completó.
  const tareasActivas = { completadaAt: null, archivadaAt: null }

  const [ingresosHoy, despachosHoy, ultIngresos, ultDespachos, tareasPendientes, tareasVencidas, analisisMes, muestrasPendientes] =
    await Promise.all([
      // Con tope superior: sin él, cualquier registro con fecha futura contaba
      // como "hoy".
      prisma.ingreso.count({ where: { fecha: { gte: hoy, lt: manana } } }),
      prisma.despacho.count({ where: { fecha: { gte: hoy, lt: manana } } }),
      prisma.ingreso.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.despacho.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.tarea.count({ where: tareasActivas }),
      prisma.tarea.count({ where: { ...tareasActivas, fechaVencimiento: { lt: hoy } } }),
      prisma.analisisTanque.count({ where: { fecha: { gte: inicioMes } } }),
      prisma.muestra.count({ where: { estado: { notIn: ['CON_RESULTADO', 'ANULADA'] } } }),
    ])

  let estadisticas: { analistas: unknown[]; tareas: unknown[]; ingresos: unknown[]; despachos: unknown[] } | null = null
  if (role === 'supervisor') {
    // Acotado al período más largo que ofrece el selector de EstadisticasView.
    // Antes se traían las tablas enteras —todas las tareas con tres relaciones
    // completas, todos los ingresos y todos los despachos— en cada visita al
    // dashboard, y el peso crecía sin techo. Además se piden solo los cinco
    // campos que las estadísticas miran de verdad.
    const desde = sumarDias(hoy, -PERIODO_MAX_DIAS)
    const [analistas, tareas, ingresosOp, despachosOp] = await Promise.all([
      prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
      prisma.tarea.findMany({
        where: { createdAt: { gte: desde } },
        select: {
          createdAt: true,
          completadaAt: true,
          analistaId1: true,
          analistaId2: true,
          columna: { select: { nombre: true } },
        },
      }),
      prisma.ingreso.findMany({ where: { createdAt: { gte: desde } }, select: { operador: true, createdAt: true } }),
      prisma.despacho.findMany({ where: { createdAt: { gte: desde } }, select: { operador: true, createdAt: true } }),
    ])
    estadisticas = { analistas, tareas, ingresos: ingresosOp, despachos: despachosOp }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-dark mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Ingresos hoy" value={ingresosHoy} color="green" />
            <StatCard label="Despachos hoy" value={despachosHoy} color="mustard" />
            <StatCard label="Tareas pendientes" value={tareasPendientes} color="dark" />
            <StatCard label="Tareas vencidas" value={tareasVencidas} color="red" />
            <StatCard label="Análisis de tanque (mes)" value={analisisMes} color="green" />
            <StatCard label="Muestras sin resultado" value={muestrasPendientes} color="mustard" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Últimos ingresos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left pb-2">HR/Remito</th>
                    <th className="text-left pb-2">Origen</th>
                    <th className="text-left pb-2">Producto</th>
                    <th className="text-left pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ultIngresos.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{i.hrRemito}</td>
                      <td className="py-2">{i.origen}</td>
                      <td className="py-2">{i.producto1}</td>
                      <td className="py-2">{formatDateOnly(i.fecha)}</td>
                    </tr>
                  ))}
                  {ultIngresos.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin registros</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Últimos despachos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left pb-2">HR/Contrato</th>
                    <th className="text-left pb-2">Destino</th>
                    <th className="text-left pb-2">Producto</th>
                    <th className="text-left pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ultDespachos.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{d.hrContrato}</td>
                      <td className="py-2">{d.destino}</td>
                      <td className="py-2">{d.producto}</td>
                      <td className="py-2">{formatDateOnly(d.fecha)}</td>
                    </tr>
                  ))}
                  {ultDespachos.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin registros</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <NotasTablero />
        </div>
      </div>

      {estadisticas && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-700 mb-4">Estadísticas de analistas</h3>
          <EstadisticasView
            analistas={estadisticas.analistas as Parameters<typeof EstadisticasView>[0]['analistas']}
            tareas={estadisticas.tareas as Parameters<typeof EstadisticasView>[0]['tareas']}
            ingresos={estadisticas.ingresos as Parameters<typeof EstadisticasView>[0]['ingresos']}
            despachos={estadisticas.despachos as Parameters<typeof EstadisticasView>[0]['despachos']}
          />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-brand-green-light border-brand-green text-brand-green-dark',
    mustard: 'bg-amber-50 border-brand-mustard text-brand-mustard-dark',
    dark: 'bg-slate-50 border-slate-300 text-brand-dark',
    red: 'bg-red-50 border-brand-red text-brand-red-dark',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
