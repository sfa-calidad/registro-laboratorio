'use client'
import { useState } from 'react'
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

export default function DespachosList({
  despachos,
  productos,
}: {
  despachos: Despacho[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
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
  })

  const filtered = despachos.filter(
    (d) =>
      d.hrContrato.toLowerCase().includes(search.toLowerCase()) ||
      d.destino.toLowerCase().includes(search.toLowerCase()) ||
      d.producto.toLowerCase().includes(search.toLowerCase()) ||
      d.idTransporte.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/despachos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const newDespacho = await res.json()
      setShowForm(false)
      setForm({ hrContrato: '', fecha: todayISO(), destino: '', producto: '', deposito: '', idTransporte: '', observacion: '', precintSFA: '', precintAduana: '', operador: '' })
      router.refresh()
      if (confirm('Despacho registrado. ¿Generar rótulo ahora?')) {
        await fetch('/api/rotulos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'SALIDAS',
            data: { ...form, id: newDespacho.id },
            despachoId: newDespacho.id,
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
          placeholder="Buscar por HR, destino, producto o transporte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-80"
        />
        <div className="flex gap-2">
          <a
            href="/api/despachos/export"
            download
            className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
          >
            Exportar CSV
          </a>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Nuevo Despacho
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-4">Nuevo Despacho</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">HR / Contrato *</label>
                <input required value={form.hrContrato} onChange={(e) => setForm({ ...form, hrContrato: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ID Transporte / Patente *</label>
                <input required value={form.idTransporte} onChange={(e) => setForm({ ...form, idTransporte: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Destino / Cliente *</label>
                <input required value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto *</label>
                <select required value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Depósito / Tanque</label>
                <input value={form.deposito} onChange={(e) => setForm({ ...form, deposito: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto SFA</label>
                <input value={form.precintSFA} onChange={(e) => setForm({ ...form, precintSFA: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Precinto Aduana</label>
                <input value={form.precintAduana} onChange={(e) => setForm({ ...form, precintAduana: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Despacho'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">HR / Contrato</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Transporte</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Precinto SFA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Precinto Aduana</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{d.hrContrato}</td>
                <td className="px-4 py-3">{formatDate(d.fecha)}</td>
                <td className="px-4 py-3">{d.destino}</td>
                <td className="px-4 py-3">{d.producto}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.idTransporte}</td>
                <td className="px-4 py-3">{d.precintSFA || '—'}</td>
                <td className="px-4 py-3">{d.precintAduana || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
