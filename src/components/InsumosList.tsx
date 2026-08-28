'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateOnly, todayISO } from '@/lib/utils'
import {
  ETIQUETA_ESTADO,
  TIPOS_MOVIMIENTO,
  estadoInsumo,
  formatearNumero,
  type EstadoInsumo,
  type TipoMovimiento,
} from '@/lib/inventario'

type Sustancia = { id: number; nombre: string; gtin: string; unidad: string }
type Ubicacion = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }

type Insumo = {
  id: number
  nombre: string
  categoria: string
  presentacion: string
  ubicacion: string | null
  stock: number
  stockMinimo: number | null
  seControla: boolean
  contenidoPorEnvase: number | null
  unidadContenido: string | null
  sustanciaId: number | null
  sustancia: Sustancia | null
  observacion: string | null
  ultimoRecuento: Date | string | null
}

type Movimiento = {
  id: number
  tipo: string
  cantidad: number
  stockPrevio: number
  stockNuevo: number
  motivo: string | null
  analista: string | null
  fecha: Date | string
}

const PAGE_SIZE = 15

// Las tres pastillas de estado se calculan en un solo lugar, como badgeEstado en
// MuestrasList: si cada pantalla arma la suya, dejan de significar lo mismo.
const CLASE_ESTADO: Record<EstadoInsumo, string> = {
  SIN_STOCK: 'bg-brand-red text-white',
  BAJO_MINIMO: 'bg-brand-mustard text-white',
  NO_CONTROLADO: 'bg-gray-200 text-gray-600',
  OK: '',
}

const emptyForm = {
  nombre: '',
  categoria: 'REACTIVO',
  presentacion: '',
  ubicacion: '',
  stock: '',
  stockMinimo: '',
  seControla: true,
  contenidoPorEnvase: '',
  unidadContenido: '',
  sustanciaId: '',
  observacion: '',
}

export default function InsumosList({
  insumos,
  ubicaciones,
  sustancias,
  analistas,
  esSupervisor,
}: {
  insumos: Insumo[]
  ubicaciones: Ubicacion[]
  sustancias: Sustancia[]
  analistas: Analista[]
  esSupervisor: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [soloFaltantes, setSoloFaltantes] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)

  // Movimiento rápido desde una fila.
  const [moviendo, setMoviendo] = useState<{ insumo: Insumo; tipo: TipoMovimiento } | null>(null)
  const [movForm, setMovForm] = useState({ cantidad: '', motivo: '', analista: '', fecha: '' })

  // Historial de un insumo: se pide al abrirlo.
  const [historialDe, setHistorialDe] = useState<Insumo | null>(null)
  const [historial, setHistorial] = useState<Movimiento[] | null>(null)

  // Alta y edición (solo supervisor).
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  function avisar(texto: string, error = false) {
    setAviso({ texto, error })
    setTimeout(() => setAviso(null), 5000)
  }

  const filtrados = insumos.filter((i) => {
    if (categoria && i.categoria !== categoria) return false
    if (ubicacion && i.ubicacion !== ubicacion) return false
    if (soloFaltantes) {
      const e = estadoInsumo(i)
      if (e !== 'SIN_STOCK' && e !== 'BAJO_MINIMO') return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return (
      i.nombre.toLowerCase().includes(q) ||
      i.presentacion.toLowerCase().includes(q) ||
      (i.ubicacion || '').toLowerCase().includes(q) ||
      (i.sustancia?.nombre || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function buscar(v: string) {
    setSearch(v)
    setPage(1)
  }

  // --- Movimientos -----------------------------------------------------------

  function abrirMovimiento(insumo: Insumo, tipo: TipoMovimiento) {
    setMovForm({ cantidad: '', motivo: '', analista: '', fecha: todayISO() })
    setMoviendo({ insumo, tipo })
  }

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!moviendo) return
    const cantidad = Number(movForm.cantidad.replace(',', '.'))
    if (!Number.isFinite(cantidad) || cantidad < 0) return avisar('La cantidad no es un número', true)

    setLoading(true)
    const res = await fetch('/api/insumos/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insumoId: moviendo.insumo.id,
        tipo: moviendo.tipo,
        cantidad,
        motivo: movForm.motivo || undefined,
        analista: movForm.analista || undefined,
        fecha: movForm.fecha || undefined,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return avisar(d.error || 'No se pudo registrar el movimiento', true)
    }
    const guardado = await res.json().catch(() => ({}))
    setMoviendo(null)
    // Si el movimiento dejó el insumo bajo el mínimo, la API creó sola la tarea
    // de reposición y lo dice acá, para no tener que ir al tablero a mirar.
    avisar(
      guardado.aviso
        ? `Movimiento registrado. Quedó bajo el mínimo: se creó la tarea "${guardado.aviso}"`
        : `${moviendo.insumo.nombre}: movimiento registrado`,
    )
    router.refresh()
  }

  async function verHistorial(insumo: Insumo) {
    setHistorialDe(insumo)
    setHistorial(null)
    const res = await fetch(`/api/insumos/movimientos?insumoId=${insumo.id}`)
    setHistorial(res.ok ? await res.json() : [])
  }

  // --- Alta y edición --------------------------------------------------------

  function abrirNuevo() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setShowForm(true)
  }

  function abrirEdicion(i: Insumo) {
    setForm({
      nombre: i.nombre,
      categoria: i.categoria,
      presentacion: i.presentacion,
      ubicacion: i.ubicacion || '',
      stock: '',
      stockMinimo: i.stockMinimo === null ? '' : String(i.stockMinimo),
      seControla: i.seControla,
      contenidoPorEnvase: i.contenidoPorEnvase === null ? '' : String(i.contenidoPorEnvase),
      unidadContenido: i.unidadContenido || '',
      sustanciaId: i.sustanciaId === null ? '' : String(i.sustanciaId),
      observacion: i.observacion || '',
    })
    setEditingId(i.id)
    setShowForm(true)
  }

  const numeroOpcional = (v: string) => {
    const t = v.trim()
    if (!t) return null
    const n = Number(t.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  async function guardarInsumo(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const cuerpo = {
      nombre: form.nombre,
      categoria: form.categoria,
      presentacion: form.presentacion,
      ubicacion: form.ubicacion || null,
      stockMinimo: numeroOpcional(form.stockMinimo),
      seControla: form.seControla,
      contenidoPorEnvase: numeroOpcional(form.contenidoPorEnvase),
      unidadContenido: form.unidadContenido || null,
      sustanciaId: form.sustanciaId ? Number(form.sustanciaId) : null,
      observacion: form.observacion,
      ...(editingId === null ? { stock: numeroOpcional(form.stock) ?? 0 } : {}),
    }

    const res = await fetch(editingId ? `/api/insumos/${editingId}` : '/api/insumos', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return avisar(d.error || 'No se pudo guardar', true)
    }
    setShowForm(false)
    avisar(editingId ? 'Insumo actualizado' : 'Insumo agregado')
    router.refresh()
  }

  async function darDeBaja(i: Insumo) {
    const res = await fetch(`/api/insumos/${i.id}`, { method: 'DELETE' })
    if (!res.ok) return avisar('No se pudo dar de baja', true)
    avisar(`${i.nombre} dado de baja`)
    router.refresh()
  }

  // La sustancia elegida manda la unidad: sin densidad no se puede pasar de
  // kilos a litros, así que solo se ofrecen las que coinciden con el envase.
  const sustanciasCompatibles = form.unidadContenido
    ? sustancias.filter((s) => s.unidad === form.unidadContenido)
    : sustancias

  const faltantes = insumos.filter((i) => {
    const e = estadoInsumo(i)
    return e === 'SIN_STOCK' || e === 'BAJO_MINIMO'
  }).length

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => buscar(e.target.value)}
          placeholder="Buscar por nombre, ubicación o sustancia..."
          className="flex-1 min-w-52 border rounded-lg px-3 py-2 text-base"
        />
        <select
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-base"
        >
          <option value="">Todo</option>
          <option value="REACTIVO">Reactivos</option>
          <option value="VIDRIO">Material de vidrio</option>
        </select>
        <select
          value={ubicacion}
          onChange={(e) => { setUbicacion(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-base"
        >
          <option value="">Toda ubicación</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.nombre}>{u.nombre}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setSoloFaltantes((v) => !v); setPage(1) }}
          className={`px-3 py-2 rounded-lg text-sm font-medium border ${
            soloFaltantes
              ? 'bg-brand-mustard text-white border-brand-mustard'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Faltantes ({faltantes})
        </button>
        {/* window.location y no un <a>: es una descarga, no una navegación.
            Mismo camino que el botón de exportar de ingresos y despachos. */}
        <button
          type="button"
          onClick={() => {
            window.location.href = `/api/insumos/export${categoria ? `?categoria=${categoria}` : ''}`
          }}
          className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"
        >
          Exportar
        </button>
        {esSupervisor && (
          <button
            onClick={abrirNuevo}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark"
          >
            Nuevo insumo
          </button>
        )}
      </div>

      {/* Listado */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Insumo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Ubicación</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Stock</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Estado</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((i) => {
              const estado = estadoInsumo(i)
              return (
                <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">
                      {i.nombre}
                      {i.presentacion && <span className="text-gray-400 font-normal"> · {i.presentacion}</span>}
                    </div>
                    {i.sustancia && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-green-light text-brand-green-dark">
                        {i.sustancia.nombre} · {i.sustancia.gtin}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-sm">{i.ubicacion || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {formatearNumero(i.stock)}
                    {i.stockMinimo !== null && (
                      <span className="text-gray-400 font-normal text-xs"> / {formatearNumero(i.stockMinimo)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {estado !== 'OK' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CLASE_ESTADO[estado]}`}>
                        {ETIQUETA_ESTADO[estado]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => abrirMovimiento(i, 'CONSUMO')}
                      className="text-brand-green-dark hover:text-brand-green text-sm font-medium mr-2"
                    >
                      Consumir
                    </button>
                    <button
                      onClick={() => abrirMovimiento(i, 'ENTRADA')}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-2"
                    >
                      Entrada
                    </button>
                    <button
                      onClick={() => verHistorial(i)}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-2"
                    >
                      Historial
                    </button>
                    {esSupervisor && (
                      <button
                        onClick={() => abrirEdicion(i)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  No hay insumos que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filtrados.length} de {insumos.length} insumos
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="px-2 py-1.5">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Movimiento rápido */}
      {moviendo && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setMoviendo(null)}
        >
          <form
            onSubmit={guardarMovimiento}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                {TIPOS_MOVIMIENTO.find((t) => t.tipo === moviendo.tipo)?.etiqueta} · {moviendo.insumo.nombre}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Hay {formatearNumero(moviendo.insumo.stock)}
                {moviendo.insumo.presentacion && ` de ${moviendo.insumo.presentacion}`}
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Cantidad *</label>
                <input
                  value={movForm.cantidad}
                  onChange={(e) => setMovForm({ ...movForm, cantidad: e.target.value })}
                  inputMode="decimal"
                  autoFocus
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={movForm.fecha}
                  onChange={(e) => setMovForm({ ...movForm, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Analista</label>
                <select
                  value={movForm.analista}
                  onChange={(e) => setMovForm({ ...movForm, analista: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                >
                  <option value="">—</option>
                  {analistas.map((a) => (
                    <option key={a.id} value={`${a.nombre} ${a.apellido}`}>
                      {a.nombre} {a.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Motivo</label>
                <input
                  value={movForm.motivo}
                  onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
                  placeholder={moviendo.tipo === 'ENTRADA' ? 'Remito, proveedor...' : 'Para qué se usó'}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoviendo(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-40"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      {historialDe && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setHistorialDe(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">Historial · {historialDe.nombre}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Cada línea dice cuánto había antes y cuánto quedó. Es lo que la planilla no guardaba.
              </p>
            </div>
            <div className="p-5">
              {historial === null && <p className="text-gray-400 text-sm">Cargando...</p>}
              {historial?.length === 0 && (
                <p className="text-gray-400 text-sm">Todavía no hay movimientos registrados.</p>
              )}
              {historial && historial.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Movimiento</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Cantidad</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Quedó</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateOnly(m.fecha)}</td>
                        <td className="px-3 py-2">
                          {TIPOS_MOVIMIENTO.find((t) => t.tipo === m.tipo)?.etiqueta || m.tipo}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{formatearNumero(m.cantidad)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          <span className="text-gray-400">{formatearNumero(m.stockPrevio)} → </span>
                          <span className="font-semibold">{formatearNumero(m.stockNuevo)}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {m.motivo || '—'}
                          {m.analista && <span className="text-gray-400"> · {m.analista}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-5 border-t flex justify-end">
              <button
                onClick={() => setHistorialDe(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alta y edición: solo supervisor */}
      {showForm && esSupervisor && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={guardarInsumo}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Editar insumo' : 'Nuevo insumo'}
              </h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Categoría *</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                >
                  <option value="REACTIVO">Reactivo</option>
                  <option value="VIDRIO">Material de vidrio</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Presentación</label>
                <input
                  value={form.presentacion}
                  onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                  placeholder="1 L, 250 g..."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ubicación</label>
                <select
                  value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                >
                  <option value="">—</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              {editingId === null && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Stock inicial</label>
                  <input
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    inputMode="decimal"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  />
                  <p className="text-xs text-gray-400 mt-1">Queda registrado como una entrada.</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Stock mínimo</label>
                <input
                  value={form.stockMinimo}
                  onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                  inputMode="decimal"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
                <p className="text-xs text-gray-400 mt-1">Debajo de esto avisa.</p>
              </div>
              <div className="md:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.seControla}
                    onChange={(e) => setForm({ ...form, seControla: e.target.checked })}
                  />
                  Se cuenta en el laboratorio
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Destildado para lo que se pide a pañol: no avisa de faltante aunque esté en cero.
                </p>
              </div>
              <div className="md:col-span-2 border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Precursor químico (RENPRE)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contenido por envase</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={form.contenidoPorEnvase}
                    onChange={(e) => setForm({ ...form, contenidoPorEnvase: e.target.value })}
                    inputMode="decimal"
                    placeholder="1"
                    className="flex-1 border rounded-lg px-3 py-2 text-base"
                  />
                  <select
                    value={form.unidadContenido}
                    onChange={(e) => setForm({ ...form, unidadContenido: e.target.value, sustanciaId: '' })}
                    className="border rounded-lg px-3 py-2 text-base"
                  >
                    <option value="">—</option>
                    <option value="L">L</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sustancia controlada</label>
                <select
                  value={form.sustanciaId}
                  onChange={(e) => setForm({ ...form, sustanciaId: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                >
                  <option value="">No es precursor</option>
                  {sustanciasCompatibles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.unidad}
                    </option>
                  ))}
                </select>
                {form.unidadContenido && sustanciasCompatibles.length === 0 && (
                  <p className="text-xs text-brand-mustard-dark mt-1">
                    Ninguna sustancia se declara en {form.unidadContenido}.
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <input
                  value={form.observacion}
                  onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-between">
              <div>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      const i = insumos.find((x) => x.id === editingId)
                      if (i) darDeBaja(i)
                      setShowForm(false)
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Dar de baja
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-40"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {aviso && (
        <div
          className={`fixed bottom-4 right-4 z-[70] px-4 py-2.5 rounded-lg shadow-lg text-sm text-white animate-fade-in ${
            aviso.error ? 'bg-brand-red' : 'bg-brand-dark'
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
