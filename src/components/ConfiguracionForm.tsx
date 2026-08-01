'use client'
import { useState, useEffect } from 'react'

export default function ConfiguracionForm({ values, esSupervisor }: { values: Record<string, string>; esSupervisor: boolean }) {
  const [form, setForm] = useState(values)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productos, setProductos] = useState<{id:number,nombre:string}[]>([])
  const [newProducto, setNewProducto] = useState('')
  const [contactos, setContactos] = useState<{id:number,nombre:string}[]>([])
  const [newContacto, setNewContacto] = useState('')
  const [logoPreview, setLogoPreview] = useState<string>(values.logo || '')
  const [analistas, setAnalistas] = useState<{id:number,nombre:string,apellido:string}[]>([])
  const [analistasInactivos, setAnalistasInactivos] = useState<{id:number,nombre:string,apellido:string}[]>([])
  const [newAnalistaNombre, setNewAnalistaNombre] = useState('')
  const [newAnalistaApellido, setNewAnalistaApellido] = useState('')
  const [columnas, setColumnas] = useState<{id:number,nombre:string,orden:number}[]>([])
  const [newColumna, setNewColumna] = useState('')
  const [parametrosCfg, setParametrosCfg] = useState<{id:number,nombre:string,metodo:string|null,abreviatura:string|null,unidad:string|null,decimales:number}[]>([])
  const [newParam, setNewParam] = useState({ nombre: '', metodo: '', abreviatura: '', unidad: '', decimales: '2' })
  const [labs, setLabs] = useState<{id:number,nombre:string,esExterno:boolean,delExterior:boolean}[]>([])
  const [newLab, setNewLab] = useState({ nombre: '', esExterno: true, delExterior: false })
  const [lugares, setLugares] = useState<{id:number,nombre:string}[]>([])
  const [newLugar, setNewLugar] = useState('')
  const [perfiles, setPerfiles] = useState<{id:number,producto:string,parametroId:number,orden:number,contexto:string,parametro:{nombre:string,metodo:string|null,abreviatura:string|null}}[]>([])
  const [newPerfil, setNewPerfil] = useState({ producto: '', parametroId: '', contexto: 'TANQUE' })
  const [especs, setEspecs] = useState<{id:number,producto:string,parametroId:number,min:number|null,max:number|null,parametro:{nombre:string,metodo:string|null,abreviatura:string|null}}[]>([])
  const [newEspec, setNewEspec] = useState({ producto: '', parametroId: '', min: '', max: '' })

  useEffect(() => {
    fetch('/api/productos').then(r => r.json()).then(setProductos)
    fetch('/api/columnas').then(r => r.json()).then(setColumnas)
    fetch('/api/parametros').then(r => r.json()).then(setParametrosCfg)
    fetch('/api/laboratorios').then(r => r.json()).then(setLabs)
    fetch('/api/lugares-muestreo').then(r => r.json()).then(setLugares)
    fetch('/api/perfiles-producto').then(r => r.json()).then(setPerfiles)
    fetch('/api/especificaciones').then(r => r.json()).then(setEspecs)
    if (esSupervisor) {
      fetch('/api/contactos').then(r => r.json()).then(setContactos)
      fetch('/api/analistas').then(r => r.json()).then(setAnalistas)
      fetch('/api/analistas?all=true').then(r => r.json()).then((all: {id:number,nombre:string,apellido:string,activo:boolean}[]) =>
        setAnalistasInactivos(all.filter(a => !a.activo))
      )
    }
  }, [esSupervisor])

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
      body: JSON.stringify({ nombre: newContacto.trim() }),
    })
    if (res.ok) {
      const c = await res.json()
      setContactos(cs => cs.some(x => x.id === c.id) ? cs : [...cs, c].sort((a,b) => a.nombre.localeCompare(b.nombre)))
      setNewContacto('')
    }
  }

  async function deleteContacto(id: number) {
    await fetch(`/api/contactos/${id}`, { method: 'DELETE' })
    setContactos(cs => cs.filter(c => c.id !== id))
  }

  async function addAnalista() {
    if (!newAnalistaNombre.trim() || !newAnalistaApellido.trim()) return
    const res = await fetch('/api/analistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newAnalistaNombre.trim(), apellido: newAnalistaApellido.trim() }),
    })
    if (res.ok) {
      const a = await res.json()
      setAnalistas(as => [...as, a].sort((x,y) => x.apellido.localeCompare(y.apellido)))
      setNewAnalistaNombre('')
      setNewAnalistaApellido('')
    }
  }

  async function deleteAnalista(id: number) {
    await fetch(`/api/analistas/${id}`, { method: 'DELETE' })
    const a = analistas.find(x => x.id === id)
    setAnalistas(as => as.filter(x => x.id !== id))
    if (a) setAnalistasInactivos(ai => [...ai, a])
  }

  async function reactivarAnalista(id: number) {
    const res = await fetch(`/api/analistas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: true }),
    })
    if (res.ok) {
      const a = analistasInactivos.find(x => x.id === id)
      setAnalistasInactivos(ai => ai.filter(x => x.id !== id))
      if (a) setAnalistas(as => [...as, a].sort((x, y) => x.apellido.localeCompare(y.apellido)))
    }
  }

  async function addColumna() {
    if (!newColumna.trim()) return
    const maxOrden = columnas.reduce((m, c) => Math.max(m, c.orden), 0)
    const res = await fetch('/api/columnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newColumna.trim(), orden: maxOrden + 1 }),
    })
    if (res.ok) {
      const c = await res.json()
      setColumnas(cs => [...cs, c])
      setNewColumna('')
    }
  }

  async function deleteColumna(id: number) {
    const res = await fetch(`/api/columnas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setColumnas(cs => cs.filter(c => c.id !== id))
    } else {
      const data = await res.json()
      alert(data.error || 'No se puede eliminar')
    }
  }

  async function moveColumna(id: number, direction: 'up' | 'down') {
    const sorted = [...columnas].sort((a, b) => a.orden - b.orden)
    const idx = sorted.findIndex(c => c.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      fetch(`/api/columnas/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orden: b.orden }) }),
      fetch(`/api/columnas/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orden: a.orden }) }),
    ])
    setColumnas(cs => cs.map(c => c.id === a.id ? { ...c, orden: b.orden } : c.id === b.id ? { ...c, orden: a.orden } : c))
  }

  function etiquetaParam(p: { nombre: string; metodo: string | null; abreviatura?: string | null }) {
    return `${p.nombre}${p.metodo ? ` · ${p.metodo}` : ''}`
  }

  async function addParametro() {
    if (!newParam.nombre.trim()) return
    const res = await fetch('/api/parametros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: newParam.nombre.trim(),
        metodo: newParam.metodo.trim() || undefined,
        abreviatura: newParam.abreviatura.trim() || undefined,
        unidad: newParam.unidad.trim() || undefined,
        decimales: Number(newParam.decimales) || 2,
      }),
    })
    if (res.ok) {
      const p = await res.json()
      setParametrosCfg(ps => ps.some(x => x.id === p.id) ? ps : [...ps, p])
      setNewParam({ nombre: '', metodo: '', abreviatura: '', unidad: '', decimales: '2' })
    }
  }

  async function deleteParametro(id: number) {
    await fetch(`/api/parametros/${id}`, { method: 'DELETE' })
    setParametrosCfg(ps => ps.filter(p => p.id !== id))
  }

  async function addLab() {
    if (!newLab.nombre.trim()) return
    const res = await fetch('/api/laboratorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLab),
    })
    if (res.ok) {
      const l = await res.json()
      setLabs(ls => ls.some(x => x.id === l.id) ? ls : [...ls, l].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNewLab({ nombre: '', esExterno: true, delExterior: false })
    }
  }

  async function deleteLab(id: number) {
    await fetch(`/api/laboratorios/${id}`, { method: 'DELETE' })
    setLabs(ls => ls.filter(l => l.id !== id))
  }

  async function addLugar() {
    if (!newLugar.trim()) return
    const res = await fetch('/api/lugares-muestreo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newLugar.trim() }),
    })
    if (res.ok) {
      const l = await res.json()
      setLugares(ls => ls.some(x => x.id === l.id) ? ls : [...ls, l].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNewLugar('')
    }
  }

  async function deleteLugar(id: number) {
    await fetch(`/api/lugares-muestreo/${id}`, { method: 'DELETE' })
    setLugares(ls => ls.filter(l => l.id !== id))
  }

  async function addPerfil() {
    if (!newPerfil.producto || !newPerfil.parametroId) return
    const res = await fetch('/api/perfiles-producto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producto: newPerfil.producto,
        parametroId: Number(newPerfil.parametroId),
        contexto: newPerfil.contexto,
      }),
    })
    if (res.ok) {
      const p = await res.json()
      setPerfiles(ps => ps.some(x => x.id === p.id) ? ps.map(x => x.id === p.id ? p : x) : [...ps, p])
      setNewPerfil(np => ({ ...np, parametroId: '' }))
    }
  }

  async function deletePerfil(id: number) {
    await fetch(`/api/perfiles-producto/${id}`, { method: 'DELETE' })
    setPerfiles(ps => ps.filter(p => p.id !== id))
  }

  async function addEspec() {
    if (!newEspec.producto || !newEspec.parametroId || (!newEspec.min && !newEspec.max)) return
    const res = await fetch('/api/especificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producto: newEspec.producto,
        parametroId: Number(newEspec.parametroId),
        min: newEspec.min !== '' ? Number(newEspec.min.replace(',', '.')) : null,
        max: newEspec.max !== '' ? Number(newEspec.max.replace(',', '.')) : null,
      }),
    })
    if (res.ok) {
      const e = await res.json()
      setEspecs(es => es.some(x => x.id === e.id) ? es.map(x => x.id === e.id ? e : x) : [...es, e])
      setNewEspec(ne => ({ ...ne, parametroId: '', min: '', max: '' }))
    }
  }

  async function deleteEspec(id: number) {
    await fetch(`/api/especificaciones/${id}`, { method: 'DELETE' })
    setEspecs(es => es.filter(e => e.id !== id))
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* La configuración general es global (nombre, logo, tamaño de etiqueta)
          y la API la reserva al supervisor: sin este aviso el analista veía el
          formulario, guardaba y recibía un error sin entender por qué. */}
      {!esSupervisor && (
        <div className="rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark">
          La configuración general la cambia el supervisor. Podés verla, pero no guardar cambios.
        </div>
      )}
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
          <button type="submit" disabled={loading || !esSupervisor}
            className="bg-brand-green text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed">
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
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
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

      {esSupervisor && (
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Contactos (Proveedores / Clientes)</h3>
        <p className="text-xs text-gray-400">Un mismo contacto puede usarse como origen en Ingresos y como destino en Despachos.</p>
        <div className="flex gap-2">
          <input value={newContacto} onChange={(e) => setNewContacto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContacto())}
            placeholder="Nombre" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addContacto}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {contactos.map(c => (
            <li key={c.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>{c.nombre}</span>
              <button onClick={() => deleteContacto(c.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
            </li>
          ))}
          {contactos.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin contactos registrados</li>}
        </ul>
      </div>
      )}
      {esSupervisor && (
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Analistas</h3>
        <div className="flex gap-2">
          <input value={newAnalistaNombre} onChange={(e) => setNewAnalistaNombre(e.target.value)}
            placeholder="Nombre" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <input value={newAnalistaApellido} onChange={(e) => setNewAnalistaApellido(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAnalista())}
            placeholder="Apellido" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addAnalista}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {analistas.map(a => (
            <li key={a.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>{a.nombre} {a.apellido}</span>
              <button onClick={() => deleteAnalista(a.id)} className="text-red-400 hover:text-red-600 text-sm">Desactivar</button>
            </li>
          ))}
          {analistas.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin analistas registrados</li>}
        </ul>
        {analistasInactivos.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-400 mb-1">Desactivados</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {analistasInactivos.map(a => (
                <li key={a.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base text-gray-400">
                  <span>{a.nombre} {a.apellido}</span>
                  <button onClick={() => reactivarAnalista(a.id)} className="text-brand-green hover:text-brand-green-dark text-sm">Reactivar</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      )}

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Columnas del Tablero</h3>
        <div className="flex gap-2">
          <input value={newColumna} onChange={(e) => setNewColumna(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColumna())}
            placeholder="Nombre de columna" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addColumna}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1">
          {[...columnas].sort((a,b) => a.orden - b.orden).map((c, idx, arr) => (
            <li key={c.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>{c.nombre}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveColumna(c.id, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↑</button>
                <button onClick={() => moveColumna(c.id, 'down')} disabled={idx === arr.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↓</button>
                <button onClick={() => deleteColumna(c.id)} className="text-red-400 hover:text-red-600 text-sm ml-1">Eliminar</button>
              </div>
            </li>
          ))}
          {columnas.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin columnas</li>}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Parámetros de análisis</h3>
        <p className="text-xs text-gray-400">El método es parte de la identidad del ensayo: Humedad · Termobalanza y Humedad · Karl Fischer son parámetros distintos.</p>
        <div className="grid grid-cols-6 gap-1.5">
          <input value={newParam.nombre} onChange={(e) => setNewParam({ ...newParam, nombre: e.target.value })}
            placeholder="Nombre" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm" />
          <input value={newParam.metodo} onChange={(e) => setNewParam({ ...newParam, metodo: e.target.value })}
            placeholder="Método" className="border rounded-lg px-2 py-1.5 text-sm" />
          <input value={newParam.abreviatura} onChange={(e) => setNewParam({ ...newParam, abreviatura: e.target.value })}
            placeholder="Abrev." className="border rounded-lg px-2 py-1.5 text-sm" />
          <input value={newParam.unidad} onChange={(e) => setNewParam({ ...newParam, unidad: e.target.value })}
            placeholder="Unidad" className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="number" min="0" max="6" value={newParam.decimales} onChange={(e) => setNewParam({ ...newParam, decimales: e.target.value })}
            placeholder="Dec." title="Decimales" className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button type="button" onClick={addParametro}
          className="bg-brand-green text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar parámetro</button>
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {parametrosCfg.map(p => (
            <li key={p.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-sm">
              <span>
                {etiquetaParam(p)}
                {p.abreviatura && <span className="text-gray-400"> — {p.abreviatura}</span>}
                {p.unidad && <span className="text-gray-400"> ({p.unidad})</span>}
              </span>
              <button onClick={() => deleteParametro(p.id)} className="text-red-400 hover:text-red-600 text-sm">Desactivar</button>
            </li>
          ))}
          {parametrosCfg.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin parámetros</li>}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Laboratorios</h3>
        <div className="flex gap-2 items-center">
          <input value={newLab.nombre} onChange={(e) => setNewLab({ ...newLab, nombre: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLab())}
            placeholder="Nombre" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={!newLab.esExterno} onChange={(e) => setNewLab({ ...newLab, esExterno: !e.target.checked })} />
            Interno
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={newLab.delExterior} onChange={(e) => setNewLab({ ...newLab, delExterior: e.target.checked })} />
            Del exterior
          </label>
          <button type="button" onClick={addLab}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {labs.map(l => (
            <li key={l.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>
                {l.nombre}
                {!l.esExterno && <span className="text-xs text-brand-green-dark bg-brand-green-light rounded-full px-2 py-0.5 ml-2">interno</span>}
                {l.delExterior && <span className="text-xs text-brand-mustard-dark bg-amber-50 rounded-full px-2 py-0.5 ml-2">del exterior</span>}
              </span>
              <button onClick={() => deleteLab(l.id)} className="text-red-400 hover:text-red-600 text-sm">Desactivar</button>
            </li>
          ))}
          {labs.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin laboratorios</li>}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Lugares de muestreo</h3>
        <div className="flex gap-2">
          <input value={newLugar} onChange={(e) => setNewLugar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLugar())}
            placeholder="Nombre del lugar" className="flex-1 border rounded-lg px-3 py-2 text-base" />
          <button type="button" onClick={addLugar}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {lugares.map(l => (
            <li key={l.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-base">
              <span>{l.nombre}</span>
              <button onClick={() => deleteLugar(l.id)} className="text-red-400 hover:text-red-600 text-sm">Desactivar</button>
            </li>
          ))}
          {lugares.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin lugares registrados</li>}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Perfiles por producto</h3>
        <p className="text-xs text-gray-400">
          Qué parámetros se muestran por defecto al cargar un análisis de cada producto. El
          camión que entra (materia prima) lleva más ensayos que el control de tanque, por eso
          cada uno tiene su propio perfil.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <select value={newPerfil.contexto} onChange={(e) => setNewPerfil({ ...newPerfil, contexto: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="TANQUE">Tanques</option>
            <option value="MATERIA_PRIMA">Materia prima</option>
          </select>
          <select value={newPerfil.producto} onChange={(e) => setNewPerfil({ ...newPerfil, producto: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm flex-1">
            <option value="">Producto...</option>
            {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
          </select>
          <select value={newPerfil.parametroId} onChange={(e) => setNewPerfil({ ...newPerfil, parametroId: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm flex-1">
            <option value="">Parámetro...</option>
            {parametrosCfg.map(p => <option key={p.id} value={p.id}>{etiquetaParam(p)}</option>)}
          </select>
          <button type="button" onClick={addPerfil}
            className="bg-brand-green text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {(['TANQUE', 'MATERIA_PRIMA'] as const).map(ctx => {
            const delContexto = perfiles.filter(p => (p.contexto || 'TANQUE') === ctx)
            if (delContexto.length === 0) return null
            return (
              <li key={ctx}>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold px-2 pt-2">
                  {ctx === 'TANQUE' ? 'Tanques' : 'Materia prima'}
                </div>
                <ul>
                  {[...new Set(delContexto.map(p => p.producto))].sort().map(prod => (
                    <li key={prod} className="py-1 px-2 text-sm">
                      <span className="font-medium text-gray-700">{prod}:</span>{' '}
                      {delContexto.filter(p => p.producto === prod).sort((a, b) => a.orden - b.orden).map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mr-1 mb-0.5">
                          {p.parametro.abreviatura || etiquetaParam(p.parametro)}
                          <button onClick={() => deletePerfil(p.id)} className="text-red-400 hover:text-red-600">×</button>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
          {perfiles.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin perfiles</li>}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Especificaciones</h3>
        <p className="text-xs text-gray-400">Rangos por producto y parámetro; lo que se va del rango se marca en rojo (avisa, no bloquea).</p>
        <div className="flex gap-1.5">
          <select value={newEspec.producto} onChange={(e) => setNewEspec({ ...newEspec, producto: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm flex-1">
            <option value="">Producto...</option>
            {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
          </select>
          <select value={newEspec.parametroId} onChange={(e) => setNewEspec({ ...newEspec, parametroId: e.target.value })}
            className="border rounded-lg px-2 py-1.5 text-sm flex-1">
            <option value="">Parámetro...</option>
            {parametrosCfg.map(p => <option key={p.id} value={p.id}>{etiquetaParam(p)}</option>)}
          </select>
          <input value={newEspec.min} onChange={(e) => setNewEspec({ ...newEspec, min: e.target.value })}
            placeholder="Mín" inputMode="decimal" className="w-16 border rounded-lg px-2 py-1.5 text-sm" />
          <input value={newEspec.max} onChange={(e) => setNewEspec({ ...newEspec, max: e.target.value })}
            placeholder="Máx" inputMode="decimal" className="w-16 border rounded-lg px-2 py-1.5 text-sm" />
          <button type="button" onClick={addEspec}
            className="bg-brand-green text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark">Agregar</button>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {especs.map(e => (
            <li key={e.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 text-sm">
              <span>
                <span className="font-medium text-gray-700">{e.producto}</span> · {e.parametro.abreviatura || etiquetaParam(e.parametro)}:{' '}
                {e.min ?? '—'} a {e.max ?? '—'}
              </span>
              <button onClick={() => deleteEspec(e.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
            </li>
          ))}
          {especs.length === 0 && <li className="text-gray-400 text-sm py-1 px-2">Sin especificaciones</li>}
        </ul>
      </div>
    </div>
  )
}
