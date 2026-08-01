'use client'
import { useState, useEffect } from 'react'
import { formatDateOnly, todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { fueraDeRango } from '@/lib/calculos'
import type { InformeTanque } from '@/lib/informe'
import VisorInforme from './VisorInforme'
import AnalisisMateriaPrimaModal, {
  construirInforme,
  type Especificacion,
  type FilaInforme,
  type Parametro,
  type Perfil,
} from './AnalisisMateriaPrimaModal'

type AnalisisGuardado = {
  id: number
  fecha: Date | string
  producto: string
  cisternas: string | null
  ordenCompra: string | null
  analista: string | null
  comentario: string | null
  resultados: { parametroId: number; valor: number | null; valorTexto: string | null }[]
}

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
  analisis: AnalisisGuardado | null
}

type Producto = { id: number; nombre: string }
type Contacto = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }

// La fecha arranca vacía: la pone quien abre el formulario (openNew /
// openDuplicate). Calcularla acá la congelaba al cargar el módulo, y además
// daba un valor en el servidor y otro en el navegador.
const emptyForm = {
  hrRemito: '',
  fecha: '',
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
  parametros,
  perfiles,
  especificaciones,
  analistas,
}: {
  ingresos: Ingreso[]
  productos: Producto[]
  parametros: Parametro[]
  perfiles: Perfil[]
  especificaciones: Especificacion[]
  analistas: Analista[]
}) {
  const router = useRouter()
  const [proveedores, setProveedores] = useState<Contacto[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  // Análisis de materia prima: el ingreso que se está analizando y el informe
  // que se está mirando.
  const [analizando, setAnalizando] = useState<Ingreso | null>(null)
  const [informe, setInforme] = useState<{ datos: InformeTanque; nombre: string } | null>(null)
  const [config, setConfig] = useState({ empresa: 'Laboratorio SFA', logo: '' })
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/contactos').then(r => r.json()).then(setProveedores)
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => setConfig({ empresa: d.empresa || 'Laboratorio SFA', logo: d.logo || '' }))
      .catch(() => {})
  }, [])

  function avisar(texto: string, error = false) {
    setAviso({ texto, error })
    setTimeout(() => setAviso(null), 5000)
  }

  const paramPorId = new Map(parametros.map((p) => [p.id, p]))

  // Las filas del informe salen de lo guardado, ordenadas por el perfil del
  // producto para que el informe reabierto se lea igual que el del formulario.
  function filasDe(a: AnalisisGuardado): FilaInforme[] {
    const orden = new Map(
      perfiles.filter((pf) => pf.producto === a.producto).map((pf) => [pf.parametroId, pf.orden])
    )
    return a.resultados
      .map((r) => {
        const parametro = paramPorId.get(r.parametroId)
        return parametro ? { parametro, valor: r.valor, texto: r.valorTexto } : null
      })
      .filter((f): f is FilaInforme => f !== null)
      .sort(
        (x, y) =>
          (orden.get(x.parametro.id) ?? 1e6 + x.parametro.orden) -
          (orden.get(y.parametro.id) ?? 1e6 + y.parametro.orden)
      )
  }

  function informeDe(i: Ingreso): { datos: InformeTanque; nombre: string } | null {
    const a = i.analisis
    if (!a) return null
    const fecha = new Date(a.fecha).toISOString().split('T')[0]
    return {
      datos: construirInforme({
        config,
        fecha: a.fecha,
        producto: a.producto,
        origen: i.origen,
        hrRemito: i.hrRemito,
        ordenCompra: a.ordenCompra,
        cisternas: a.cisternas,
        analista: a.analista,
        comentario: a.comentario,
        filas: filasDe(a),
        especificaciones,
      }),
      nombre: `analisis-${fecha}-${i.hrRemito}`.replace(/[^\w.-]+/g, '-'),
    }
  }

  // Pastilla del listado: para poder buscar después "los camiones fuera de
  // spec del mes" sin abrir uno por uno.
  function hayDesvio(a: AnalisisGuardado): boolean {
    return a.resultados.some((r) => {
      const e = especificaciones.find((x) => x.producto === a.producto && x.parametroId === r.parametroId)
      return !!e && fueraDeRango(r.valor, { min: e.min, max: e.max })
    })
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (exportDesde) params.set('desde', exportDesde)
    if (exportHasta) params.set('hasta', exportHasta)
    const qs = params.toString()
    window.location.href = `/api/ingresos/export${qs ? `?${qs}` : ''}`
    setShowExport(false)
  }

  const filtered = ingresos.filter((i) => {
    const q = search.toLowerCase()
    // El estado del análisis entra en la búsqueda: escribir "fuera" trae los
    // camiones que dieron fuera de especificación.
    const estado = !i.analisis ? 'sin analizar' : hayDesvio(i.analisis) ? 'fuera de especificación' : 'conforme'
    return (
      i.hrRemito.toLowerCase().includes(q) ||
      i.origen.toLowerCase().includes(q) ||
      i.producto1.toLowerCase().includes(q) ||
      estado.includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
      await fetch('/api/rotulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'INGRESOS', data: { ...form, id: saved.id }, ingresoId: saved.id }),
      })
      setShowForm(false)
      setForm(emptyForm)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div>
      {aviso && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
            aviso.error ? 'bg-brand-red' : 'bg-brand-green'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {analizando && (
        <AnalisisMateriaPrimaModal
          ingreso={analizando}
          parametros={parametros}
          perfiles={perfiles}
          especificaciones={especificaciones}
          analistas={analistas}
          config={config}
          onCerrar={() => setAnalizando(null)}
          onGuardado={() => router.refresh()}
          onAviso={avisar}
          onVerInforme={(datos, nombre) => setInforme({ datos, nombre })}
        />
      )}

      {informe && (
        <VisorInforme
          informe={informe.datos}
          nombreArchivo={informe.nombre}
          onCerrar={() => setInforme(null)}
          onAviso={avisar}
        />
      )}

      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          placeholder="Buscar por HR, origen o producto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark"
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
                  list="proveedores-list"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
                <datalist id="proveedores-list">
                  {proveedores.map(p => <option key={p.id} value={p.nombre} />)}
                </datalist>
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
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50">
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar Ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">HR / Remito</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Origen</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto 1</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto 2</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Precinto</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Observación</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Operador</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Análisis</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-sm">{i.hrRemito}</td>
                <td className="px-3 py-2">{formatDateOnly(i.fecha)}</td>
                <td className="px-3 py-2">{i.origen}</td>
                <td className="px-3 py-2">{i.producto1}</td>
                <td className="px-3 py-2 text-gray-500">{i.producto2 || '—'}</td>
                <td className="px-3 py-2">{i.precinto || '—'}</td>
                <td className="px-3 py-2 max-w-xs truncate text-gray-600" title={i.observacion || ''}>{i.observacion || '—'}</td>
                <td className="px-3 py-2">{i.operador || '—'}</td>
                {/* El análisis vive en su propia columna con sus dos acciones:
                    en "Acciones" quedaban seis botones y no se leía ninguno. */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {i.analisis ? (
                    <div className="flex flex-col items-start gap-1">
                      <Pastilla desvio={hayDesvio(i.analisis)} />
                      <div className="flex items-center gap-2 text-sm">
                        <button onClick={() => setInforme(informeDe(i))} className="text-brand-green-dark hover:text-brand-green font-medium">
                          Ver informe
                        </button>
                        <button onClick={() => setAnalizando(i)} className="text-gray-500 hover:text-gray-700">
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAnalizando(i)}
                      className="text-sm border border-brand-green text-brand-green-dark px-2.5 py-1 rounded-lg hover:bg-brand-green-light font-medium"
                    >
                      Cargar análisis
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => openEdit(i)} className="text-brand-green-dark hover:text-brand-green font-medium">Editar</button>
                    <button onClick={() => openDuplicate(i)} className="text-gray-500 hover:text-gray-700 font-medium">Duplicar</button>
                    <button
                      onClick={() => {
                        const msg = `Ingresó un camión con ${i.producto1}${i.producto2 ? ` y ${i.producto2}` : ''} de ${i.origen} con HR/Remito ${i.hrRemito}, está OK de calidad.`
                        navigator.clipboard.writeText(msg).then(() => {
                          setCopiedId(i.id)
                          setTimeout(() => setCopiedId(null), 2000)
                        })
                      }}
                      className={`font-medium mr-2 ${copiedId === i.id ? 'text-green-600' : 'text-amber-600 hover:text-amber-800'}`}
                      title="Copiar mensaje para carga/descarga"
                    >
                      {copiedId === i.id ? '✓ Copiado' : 'Mensaje'}
                    </button>
                    <button onClick={() => handleDelete(i.id)} className="text-red-500 hover:text-red-700 font-medium pl-2 border-l border-gray-200">Eliminar</button>
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

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-gray-500">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Pastilla({ desvio }: { desvio: boolean }) {
  if (desvio) {
    return (
      <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-brand-red text-white whitespace-nowrap">
        ⚠ Fuera de spec
      </span>
    )
  }
  return (
    <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-brand-green-light text-brand-green-dark border border-brand-green whitespace-nowrap">
      Conforme
    </span>
  )
}
