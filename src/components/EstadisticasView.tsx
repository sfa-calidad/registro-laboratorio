'use client'
import { useState, useMemo } from 'react'

type Analista = { id: number; nombre: string; apellido: string }
type Tarea = {
  id: number
  titulo: string
  columna: { nombre: string }
  firma1: Analista | null
  firma2: Analista | null
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

const PERIODOS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Todo el tiempo', days: 0 },
]

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
        (t.firma1?.id === a.id || t.firma2?.id === a.id)
      )
      const completadas = tareasFiltered.filter(t => t.completadaAt).length
      const enProgreso = tareasFiltered.filter(t => !t.completadaAt && !t.columna.nombre.toLowerCase().includes('pendiente')).length
      const pendientes = tareasFiltered.filter(t => t.columna.nombre.toLowerCase().includes('pendiente')).length

      const ingresosCount = ingresos.filter(i => i.operador === nombreCompleto && isInPeriod(i.createdAt, periodo)).length
      const despachosCount = despachos.filter(d => d.operador === nombreCompleto && isInPeriod(d.createdAt, periodo)).length

      return { analista: a, completadas, enProgreso, pendientes, total: tareasFiltered.length, ingresos: ingresosCount, despachos: despachosCount, camiones: ingresosCount + despachosCount }
    })
  }, [analistas, tareas, ingresos, despachos, periodo])

  const maxTareas = Math.max(...stats.map(s => s.total), 1)
  const maxCamiones = Math.max(...stats.map(s => s.camiones), 1)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {PERIODOS.map(p => (
          <button
            key={p.days}
            onClick={() => setPeriodo(p.days)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodo === p.days ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas por analista */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Tareas por analista</h2>
          {stats.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {stats.map(s => (
                <div key={s.analista.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{s.analista.nombre} {s.analista.apellido}</span>
                    <span className="text-gray-400">{s.total} tareas</span>
                  </div>
                  <div className="flex gap-1 h-5 rounded overflow-hidden bg-gray-100">
                    {s.completadas > 0 && (
                      <div className="bg-green-400 flex items-center justify-center text-xs text-white" style={{ width: `${(s.completadas / maxTareas) * 100}%` }}>
                        {s.completadas > 0 && s.completadas}
                      </div>
                    )}
                    {s.enProgreso > 0 && (
                      <div className="bg-blue-400 flex items-center justify-center text-xs text-white" style={{ width: `${(s.enProgreso / maxTareas) * 100}%` }}>
                        {s.enProgreso}
                      </div>
                    )}
                    {s.pendientes > 0 && (
                      <div className="bg-gray-300 flex items-center justify-center text-xs text-gray-600" style={{ width: `${(s.pendientes / maxTareas) * 100}%` }}>
                        {s.pendientes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400 inline-block"/>Completadas: {s.completadas}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400 inline-block"/>En progreso: {s.enProgreso}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-300 inline-block"/>Pendientes: {s.pendientes}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camiones por analista */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Movimientos de camiones por analista</h2>
          {stats.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {stats.map(s => (
                <div key={s.analista.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{s.analista.nombre} {s.analista.apellido}</span>
                    <span className="text-gray-400">{s.camiones} movimientos</span>
                  </div>
                  <div className="flex gap-1 h-5 rounded overflow-hidden bg-gray-100">
                    {s.ingresos > 0 && (
                      <div className="bg-emerald-400 flex items-center justify-center text-xs text-white" style={{ width: `${(s.ingresos / maxCamiones) * 100}%` }}>
                        {s.ingresos}
                      </div>
                    )}
                    {s.despachos > 0 && (
                      <div className="bg-orange-400 flex items-center justify-center text-xs text-white" style={{ width: `${(s.despachos / maxCamiones) * 100}%` }}>
                        {s.despachos}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block"/>Ingresos: {s.ingresos}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-400 inline-block"/>Despachos: {s.despachos}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
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
                <td className="px-4 py-3 font-medium">{s.analista.nombre} {s.analista.apellido}</td>
                <td className="px-4 py-3 text-center">{s.total}</td>
                <td className="px-4 py-3 text-center text-green-600 font-medium">{s.completadas}</td>
                <td className="px-4 py-3 text-center text-emerald-600">{s.ingresos}</td>
                <td className="px-4 py-3 text-center text-orange-600">{s.despachos}</td>
                <td className="px-4 py-3 text-center font-medium">{s.camiones}</td>
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
