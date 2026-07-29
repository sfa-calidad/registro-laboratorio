'use client'
import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type Analista = { id: number; nombre: string; apellido: string }
// Solo lo que estas estadísticas realmente miran: el dashboard traía la tarea
// entera con tres relaciones completas para usar cinco campos.
type Tarea = {
  columna: { nombre: string }
  analistaId1: number | null
  analistaId2: number | null
  completadaAt: string | Date | null
  createdAt: string | Date
}
type Movimiento = { operador: string | null; createdAt: string | Date }

type Props = {
  analistas: Analista[]
  tareas: Tarea[]
  ingresos: Movimiento[]
  despachos: Movimiento[]
}

// El período más largo acota lo que se trae de la base: antes se cargaba la
// tabla entera de tareas, ingresos y despachos en cada visita al dashboard, y
// crecía sin techo. Tiene que coincidir con PERIODO_MAX_DIAS en src/app/page.tsx.
const PERIODOS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Último año', days: 365 },
]

const PIE_COLORS = ['#8bc53f', '#e0a32a', '#d1d5db']

function isInPeriod(date: string | Date, days: number): boolean {
  if (!days) return true
  const d = new Date(date)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return d >= cutoff
}

export default function EstadisticasView({ analistas, tareas, ingresos, despachos }: Props) {
  const [periodo, setPeriodo] = useState(30)

  const stats = useMemo(() => {
    return analistas.map(a => {
      const nombreCompleto = `${a.nombre} ${a.apellido}`

      const tareasFiltered = tareas.filter(t =>
        isInPeriod(t.createdAt, periodo) &&
        (t.analistaId1 === a.id || t.analistaId2 === a.id)
      )
      // Las tres categorías son excluyentes: una tarea completada que quedó en
      // la columna "Pendiente" contaba a la vez como completada y como
      // pendiente, y las porciones del gráfico sumaban más que el total.
      const completadas = tareasFiltered.filter(t => t.completadaAt).length
      const sinCompletar = tareasFiltered.filter(t => !t.completadaAt)
      const pendientes = sinCompletar.filter(t => t.columna.nombre.toLowerCase().includes('pendiente')).length
      const enProgreso = sinCompletar.length - pendientes

      const ingresosCount = ingresos.filter(i => i.operador === nombreCompleto && isInPeriod(i.createdAt, periodo)).length
      const despachosCount = despachos.filter(d => d.operador === nombreCompleto && isInPeriod(d.createdAt, periodo)).length

      return {
        nombre: nombreCompleto,
        analista: a,
        completadas, enProgreso, pendientes,
        total: tareasFiltered.length,
        ingresos: ingresosCount, despachos: despachosCount,
        camiones: ingresosCount + despachosCount,
      }
    })
  }, [analistas, tareas, ingresos, despachos, periodo])

  const totalCompletadas = stats.reduce((s, x) => s + x.completadas, 0)
  const totalEnProgreso = stats.reduce((s, x) => s + x.enProgreso, 0)
  const totalPendientes = stats.reduce((s, x) => s + x.pendientes, 0)
  const pieData = [
    { name: 'Completadas', value: totalCompletadas },
    { name: 'En progreso', value: totalEnProgreso },
    { name: 'Pendientes', value: totalPendientes },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {PERIODOS.map(p => (
          <button
            key={p.days}
            onClick={() => setPeriodo(p.days)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodo === p.days ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Tareas por analista</h2>
          {stats.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, stats.length * 50)}>
              <BarChart data={stats} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" name="Completadas" stackId="t" fill="#8bc53f" />
                <Bar dataKey="enProgreso" name="En progreso" stackId="t" fill="#e0a32a" />
                <Bar dataKey="pendientes" name="Pendientes" stackId="t" fill="#d1d5db" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Distribución de tareas</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Movimientos de camiones por analista</h2>
        {stats.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, stats.length * 50)}>
            <BarChart data={stats} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#6fa32e" />
              <Bar dataKey="despachos" name="Despachos" fill="#b6394a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Analista</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Tareas total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Completadas</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Ingresos</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Despachos</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Total movimientos</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.analista.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.nombre}</td>
                <td className="px-4 py-3 text-center text-gray-800">{s.total}</td>
                <td className="px-4 py-3 text-center text-green-600 font-medium">{s.completadas}</td>
                <td className="px-4 py-3 text-center text-emerald-600">{s.ingresos}</td>
                <td className="px-4 py-3 text-center text-orange-600">{s.despachos}</td>
                <td className="px-4 py-3 text-center font-medium text-gray-800">{s.camiones}</td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin analistas registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
