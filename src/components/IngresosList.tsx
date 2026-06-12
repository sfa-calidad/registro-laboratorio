'use client'
import { useState } from 'react'
import { formatDate, todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type Ingreso = {
  id: number
  hrRemito: string
  fecha: Date | string
  origen: string
  producto1: string
  producto2: string | null
  observacion: string | null
  precinto: string | null
  operador: string | null
}

type Producto = { id: number; nombre: string }

export default function IngresosList({
  ingresos,
  productos,
}: {
  ingresos: Ingreso[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    hrRemito: '',
    fecha: todayISO(),
    origen: '',
    producto1: '',
    producto2: '',
    observacion: '',
    precinto: '',
    operador: '',
  })

  const filtered = ingresos.filter(
    (i) =>
      i.hrRemito.toLowerCase().includes(search.toLowerCase()) ||
      i.origen.toLowerCase().includes(search.toLowerCase()) ||
      i.producto1.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const newIngreso = await res.json()
      setShowForm(false)
      setForm({ hrRemito: '', fecha: todayISO(), origen: '', producto1: '', producto2: '', observacion: '', precinto: '', operador: '' })
      router.refresh()
      if (confirm('Ingreso registrado. ¿Generar rótulo ahora?')) {
        await fetch('/api/rotulos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'INGRESOS',
            data: { ...form, id: newIngreso.id },
            ingresoId: newIngreso.id,
          }),
        })
        router.push('/rotulos')
      }
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Buscar por HR, origen o producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-72"
        />
        <div className="flex gap-2">
          <a
            href="/api/ingresos/export"
            download
            className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
          >
            Exportar CSV
          </a>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Nuevo Ingreso
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg"
          >
            <h3 className="text-lg font-bold mb-4">Nuevo Ingreso</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">HR / Remito *</label>
                <input required value={form.hrRemito} onChange={(e) => setForm({ ...form, hrRemito: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto</label>
                <input value={form.precinto} onChange={(e) => setForm({ ...form, precinto: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Origen / Proveedor *</label>
                <input required value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto 1 *</label>
                <select required value={form.producto1} onChange={(e) => setForm({ ...form, producto1: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto 2</label>
                <select value={form.producto2} onChange={(e) => setForm({ ...form, producto2: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Ninguno</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Operador / Firma</label>
                <input value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })}
                  placeholder="Nombre de quien registra"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">HR / Remito</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Origen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Producto 1</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Producto 2</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Observación</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Precinto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Operador</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{i.hrRemito}</td>
                <td className="px-4 py-3">{formatDate(i.fecha)}</td>
                <td className="px-4 py-3">{i.origen}</td>
                <td className="px-4 py-3">{i.producto1}</td>
                <td className="px-4 py-3 text-gray-500">{i.producto2 || '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{i.observacion || '—'}</td>
                <td className="px-4 py-3">{i.precinto || '—'}</td>
                <td className="px-4 py-3">{i.operador || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
