'use client'
import { useState, useEffect } from 'react'

export default function ConfiguracionForm({ values }: { values: Record<string, string> }) {
  const [form, setForm] = useState(values)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productos, setProductos] = useState<{id:number,nombre:string}[]>([])
  const [newProducto, setNewProducto] = useState('')
  const [contactos, setContactos] = useState<{id:number,nombre:string,tipo:string}[]>([])
  const [newContacto, setNewContacto] = useState('')
  const [newContactoTipo, setNewContactoTipo] = useState<'proveedor'|'cliente'>('proveedor')
  const [logoPreview, setLogoPreview] = useState<string>(values.logo || '')

  useEffect(() => {
    fetch('/api/productos').then(r => r.json()).then(setProductos)
    fetch('/api/contactos').then(r => r.json()).then(setContactos)
  }, [])

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      setForm(f => ({ ...f, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function addProducto() {
    if (!newProducto.trim()) return
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newProducto.trim() }),
    })
    if (res.ok) {
      const p = await res.json()
      setProductos(ps => [...ps, p].sort((a,b) => a.nombre.localeCompare(b.nombre)))
      setNewProducto('')
    }
  }

  async function deleteProducto(id: number) {
    await fetch(`/api/productos/${id}`, { method: 'DELETE' })
    setProductos(ps => ps.filter(p => p.id !== id))
  }

  async function addContacto() {
    if (!newContacto.trim()) return
    const res = await fetch('/api/contactos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newContacto.trim(), tipo: newContactoTipo }),
    })
    if (res.ok) {
      const c = await res.json()
      setContactos(cs => [...cs, c].sort((a,b) => a.nombre.localeCompare(b.nombre)))
      setNewContacto('')
    }
  }

  async function deleteContacto(id: number) {
    await fetch(`/api/contactos/${id}`, { method: 'DELETE' })
    setContactos(cs => cs.filter(c => c.id !== id))
  }

  const proveedores = contactos.filter(c => c.tipo === 'proveedor')
  const clientes = contactos.filter(c => c.tipo === 'cliente')

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">General</h3>
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre de la empresa</label>
            <input value={form.empresa || ''} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Operador predeterminado</label>
            <input value={form.operadorPredeterminado || ''} onChange={(e) => setForm({ ...form, operadorPredeterminado: e.target.value })}
              placeholder="Nombre por defecto en los formularios"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Logo de la empresa</h3>
          <p className="text-xs text-gray-500">El logo aparecerá en las etiquetas impresas. Recomendado: fondo blanco, formato PNG.</p>
          <div className="flex items-center gap-4">
            {logoPreview && (
              <img src={logoPreview} alt="Logo" className="h-16 object-contain border rounded-lg p-1" />
            )}
            <div>
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg font-medium border">
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(''); setForm(f => ({ ...f, logo: '' })) }}
                  className="ml-2 text-sm text-red-500 hover:text-red-700">Quitar</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Etiquetas (Impresora Zebra)</h3>
          <p className="text-xs text-gray-500">Medidas del rollo de etiquetas en milímetros.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Ancho (mm)</label>
              <input type="number" value={form.etiquetaAncho || ''} onChange={(e) => setForm({ ...form, etiquetaAncho: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Alto (mm)</label>
              <input type="number" value={form.etiquetaAlto || ''} onChange={(e) => setForm({ ...form, etiquetaAlto: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fuente (pt)</label>
              <input type="number" min="6" max="16" value={form.etiquetaFuente || ''} onChange={(e) => setForm({ ...form, etiquetaFuente: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Productos</h3>
        <div className="flex gap-2">
          <input value={newProducto} onChange={(e) => setNewProducto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProducto())}
            placeholder="Nombre del producto" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addProducto}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {productos.map(p => (
            <li key={p.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>{p.nombre}</span>
              <button onClick={() => deleteProducto(p.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Proveedores y Clientes</h3>
        <div className="flex gap-2">
          <select value={newContactoTipo} onChange={(e) => setNewContactoTipo(e.target.value as 'proveedor'|'cliente')}
            className="border rounded-lg px-3 py-2 text-base">
            <option value="proveedor">Proveedor</option>
            <option value="cliente">Cliente</option>
          </select>
          <input value={newContacto} onChange={(e) => setNewContacto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContacto())}
            placeholder="Nombre" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addContacto}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Agregar</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Proveedores ({proveedores.length})</p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {proveedores.map(c => (
                <li key={c.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
                  <span>{c.nombre}</span>
                  <button onClick={() => deleteContacto(c.id)} className="text-red-400 hover:text-red-600 text-sm">×</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Clientes ({clientes.length})</p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {clientes.map(c => (
                <li key={c.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
                  <span>{c.nombre}</span>
                  <button onClick={() => deleteContacto(c.id)} className="text-red-400 hover:text-red-600 text-sm">×</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
