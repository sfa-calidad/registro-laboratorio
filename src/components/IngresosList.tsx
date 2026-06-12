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

const emptyForm = {
  hrRemito: '',
  fecha: todayISO(),
  origen: '',
  producto1: '',
  producto2: '',
  observacion: '',
  precinto: '',
  operador: '',
}

export default function IngresosList({
  ingresos,
  productos,
}: {
  ingresos: Ingreso[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')

  function handleExport() {
    const params = new URLSearchParams()
    if (exportDesde) params.set('desde', exportDesde)
    if (exportHasta) params.set('hasta', exportHasta)
    const qs = params.toString()
    window.location.href = `/api/ingresos/export${qs ? `?${qs}` : ''}`
    setShowExport(false)
  }

  const filtered = ingresos.filter(
    (i) =>
      i.hrRemito.toLowerCase().includes(search.toLowerCase()) ||
      i.origen.toLowerCase().includes(search.toLowerCase()) ||
      i.producto1.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditingId(null)
    setForm({ ...emptyForm, fecha: todayISO() })
    setShowForm(true)
  }

  function openEdit(i: Ingreso) {
    setEditingId(i.id)
    setForm({
      hrRemito: i.hrRemito,
      fecha: new Date(i.fecha).toISOString().split('T')[0],
      origen: i.origen,
      producto1: i.producto1,
      producto2: i.producto2 || '',
      observacion: i.observacion || '',
      precinto: i.precinto || '',
      operador: i.operador || '',
    })
    setShowForm(true)
  }

  function openDuplicate(i: Ingreso) {
    setEditingId(null)
    setForm({
      hrRemito: i.hrRemito,
      fecha: todayISO(),
      origen: i.origen,
      producto1: i.producto1,
      producto2: i.producto2 || '',
      observacion: i.observacion || '',
      precinto: '',
      operador: i.operador || '',
    })
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este ingreso? También se eliminarán sus rótulos asociados.')) return
    await fetch(`/api/ingresos/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const url = editingId ? `/api/ingresos/${editingId}` : '/api/ingresos'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const saved = await res.json()
      setShowForm(false)
      setForm(emptyForm)
      router.refresh()
      if (!editingId && confirm('Ingreso guardado. ¿Generar rótulo ahora?')) {
        await fetch('/api/rotulos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'INGRESOS', data: { ...form, id: saved.id }, ingresoId: saved.id }),
        })
        router.push('/rotulos')
      }
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          placeholder="Buscar por HR, origen o producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-base w-80"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
          >
            Exportar CSV
          </button>
          <button
            onClick={openNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Nuevo Ingreso
          </button>
        </div>
      </div>

      {showExport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3">Exportar CSV</h3>
            <p className="text-sm text-gray-500 mb-3">Dejá las fechas vacías para exportar todo.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Desde</label>
                <input type="date" value={exportDesde} onChange={(e) => setExportDesde(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Hasta</label>
                <input type="date" value={exportHasta} onChange={(e) => setExportHasta(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowExport(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleExport}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Descargar</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-3">
              {editingId ? 'Editar Ingreso' : 'Nuevo Ingreso'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">HR / Remito *</label>
                <input required value={form.hrRemito} onChange={(e) => setForm({ ...form, hrRemito: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto</label>
                <input value={form.precinto} onChange={(e) => setForm({ ...form, precinto: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Origen / Proveedor *</label>
                <input required value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto 1 *</label>
                <select required value={form.producto1} onChange={(e) => setForm({ ...form, producto1: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto 2</label>
                <select value={form.producto2} onChange={(e) => setForm({ ...form, producto2: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">Ninguno</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Operador / Firma</label>
                <input value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })}
                  placeholder="Nombre de quien registra"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar Ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">HR / Remito</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Origen</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto 1</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto 2</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Precinto</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Operador</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-sm">{i.hrRemito}</td>
                <td className="px-3 py-2">{formatDate(i.fecha)}</td>
                <td className="px-3 py-2">{i.origen}</td>
                <td className="px-3 py-2">{i.producto1}</td>
                <td className="px-3 py-2 text-gray-500">{i.producto2 || '—'}</td>
                <td className="px-3 py-2">{i.precinto || '—'}</td>
                <td className="px-3 py-2">{i.operador || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => openEdit(i)} className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                    <button onClick={() => openDuplicate(i)} className="text-gray-500 hover:text-gray-700 font-medium">Duplicar</button>
                    <button
                      onClick={() => {
                        const msg = `Ingresó un camión con ${i.producto1}${i.producto2 ? ` y ${i.producto2}` : ''} de ${i.origen} con HR/Remito ${i.hrRemito}, está OK de calidad.`
                        navigator.clipboard.writeText(msg).then(() => {
                          setCopiedId(i.id)
                          setTimeout(() => setCopiedId(null), 2000)
                        })
                      }}
                      className={`font-medium ${copiedId === i.id ? 'text-green-600' : 'text-amber-600 hover:text-amber-800'}`}
                      title="Copiar mensaje para carga/descarga"
                    >
                      {copiedId === i.id ? '✓ Copiado' : 'Copiar'}
                    </button>
                    <button onClick={() => handleDelete(i.id)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-base">
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
