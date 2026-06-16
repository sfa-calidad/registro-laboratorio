'use client'
import { useState, useEffect } from 'react'
import { formatDate, todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type Despacho = {
  id: number
  hrContrato: string
  fecha: Date | string
  destino: string
  producto: string
  deposito: string | null
  idTransporte: string
  observacion: string | null
  precintSFA: string | null
  precintAduana: string | null
  operador: string | null
}

type Producto = { id: number; nombre: string }
type Contacto = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }

const emptyForm = {
  hrContrato: '',
  fecha: todayISO(),
  destino: '',
  producto: '',
  deposito: '',
  idTransporte: '',
  observacion: '',
  precintSFA: '',
  precintAduana: '',
  operador: '',
}

export default function DespachosList({
  despachos,
  productos,
}: {
  despachos: Despacho[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Contacto[]>([])
  const [analistas, setAnalistas] = useState<Analista[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')

  useEffect(() => {
    fetch('/api/contactos').then(r => r.json()).then(setClientes)
    fetch('/api/analistas').then(r => r.json()).then(setAnalistas)
  }, [])

  function handleExport() {
    const params = new URLSearchParams()
    if (exportDesde) params.set('desde', exportDesde)
    if (exportHasta) params.set('hasta', exportHasta)
    const qs = params.toString()
    window.location.href = `/api/despachos/export${qs ? `?${qs}` : ''}`
    setShowExport(false)
  }

  const filtered = despachos.filter(
    (d) =>
      d.hrContrato.toLowerCase().includes(search.toLowerCase()) ||
      d.destino.toLowerCase().includes(search.toLowerCase()) ||
      d.producto.toLowerCase().includes(search.toLowerCase()) ||
      d.idTransporte.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditingId(null)
    setForm({ ...emptyForm, fecha: todayISO() })
    setShowForm(true)
  }

  function openEdit(d: Despacho) {
    setEditingId(d.id)
    setForm({
      hrContrato: d.hrContrato,
      fecha: new Date(d.fecha).toISOString().split('T')[0],
      destino: d.destino,
      producto: d.producto,
      deposito: d.deposito || '',
      idTransporte: d.idTransporte,
      observacion: d.observacion || '',
      precintSFA: d.precintSFA || '',
      precintAduana: d.precintAduana || '',
      operador: d.operador || '',
    })
    setShowForm(true)
  }

  function openDuplicate(d: Despacho) {
    setEditingId(null)
    setForm({
      hrContrato: d.hrContrato,
      fecha: todayISO(),
      destino: d.destino,
      producto: d.producto,
      deposito: d.deposito || '',
      idTransporte: '',
      observacion: d.observacion || '',
      precintSFA: '',
      precintAduana: '',
      operador: d.operador || '',
    })
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este despacho? También se eliminarán sus rótulos asociados.')) return
    await fetch(`/api/despachos/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const url = editingId ? `/api/despachos/${editingId}` : '/api/despachos'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const saved = await res.json()
      await fetch('/api/rotulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'SALIDAS', data: { ...form, id: saved.id }, despachoId: saved.id }),
      })
      setShowForm(false)
      setForm(emptyForm)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          placeholder="Buscar por HR, destino, producto o transporte..."
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
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Nuevo Despacho
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
              {editingId ? 'Editar Despacho' : 'Nuevo Despacho'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">HR / Contrato *</label>
                <input required value={form.hrContrato} onChange={(e) => setForm({ ...form, hrContrato: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ID Transporte / Patente *</label>
                <input required value={form.idTransporte} onChange={(e) => setForm({ ...form, idTransporte: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Destino / Cliente *</label>
                <input required value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  list="clientes-list"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
                <datalist id="clientes-list">
                  {clientes.map(c => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto *</label>
                <select required value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Depósito / Tanque</label>
                <input value={form.deposito} onChange={(e) => setForm({ ...form, deposito: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto SFA</label>
                <input value={form.precintSFA} onChange={(e) => setForm({ ...form, precintSFA: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto Aduana</label>
                <input value={form.precintAduana} onChange={(e) => setForm({ ...form, precintAduana: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Operador / Firma</label>
                <select value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin operador —</option>
                  {analistas.map(a => (
                    <option key={a.id} value={`${a.nombre} ${a.apellido}`}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar Despacho'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">HR / Contrato</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Destino</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Transporte</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Precinto SFA</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Precinto Aduana</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Observación</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Operador</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-sm">{d.hrContrato}</td>
                <td className="px-3 py-2">{formatDate(d.fecha)}</td>
                <td className="px-3 py-2">{d.destino}</td>
                <td className="px-3 py-2">{d.producto}</td>
                <td className="px-3 py-2 font-mono text-sm">{d.idTransporte}</td>
                <td className="px-3 py-2">{d.precintSFA || '—'}</td>
                <td className="px-3 py-2">{d.precintAduana || '—'}</td>
                <td className="px-3 py-2 max-w-xs truncate text-gray-600" title={d.observacion || ''}>{d.observacion || '—'}</td>
                <td className="px-3 py-2">{d.operador || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => openEdit(d)} className="text-brand-green-dark hover:text-brand-green font-medium">Editar</button>
                    <button onClick={() => openDuplicate(d)} className="text-gray-500 hover:text-gray-700 font-medium">Duplicar</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-400 text-base">
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
