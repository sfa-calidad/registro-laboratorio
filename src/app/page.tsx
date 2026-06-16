import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { getRole } from '@/lib/auth'
import EstadisticasView from '@/components/EstadisticasView'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const role = await getRole()

  const [totalIngresos, totalDespachos, ingresosHoy, despachosHoy, ultIngresos, ultDespachos, tareasPendientes, tareasVencidas] =
    await Promise.all([
      prisma.ingreso.count(),
      prisma.despacho.count(),
      prisma.ingreso.count({ where: { fecha: { gte: today } } }),
      prisma.despacho.count({ where: { fecha: { gte: today } } }),
      prisma.ingreso.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.despacho.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.tarea.count({ where: { completadaAt: null } }),
      prisma.tarea.count({ where: { completadaAt: null, fechaVencimiento: { lt: today } } }),
    ])

  let estadisticas: { analistas: unknown[]; tareas: unknown[]; ingresos: unknown[]; despachos: unknown[] } | null = null
  if (role === 'supervisor') {
    const [analistas, tareas, ingresosOp, despachosOp] = await Promise.all([
      prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
      prisma.tarea.findMany({ include: { firma1: true, firma2: true, columna: true } }),
      prisma.ingreso.findMany({ select: { operador: true, createdAt: true } }),
      prisma.despacho.findMany({ select: { operador: true, createdAt: true } }),
    ])
    estadisticas = { analistas, tareas, ingresos: ingresosOp, despachos: despachosOp }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-dark mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ingresos hoy" value={ingresosHoy} color="green" />
        <StatCard label="Despachos hoy" value={despachosHoy} color="mustard" />
        <StatCard label="Tareas pendientes" value={tareasPendientes} color="dark" />
        <StatCard label="Tareas vencidas" value={tareasVencidas} color="red" />
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
                  <td className="py-2">{formatDate(i.fecha)}</td>
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
                  <td className="py-2">{formatDate(d.fecha)}</td>
                </tr>
              ))}
              {ultDespachos.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin registros</td></tr>
              )}
            </tbody>
          </table>
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
