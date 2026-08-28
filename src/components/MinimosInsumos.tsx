'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ETIQUETA_ESTADO, estadoInsumo, formatearNumero } from '@/lib/inventario'

type Insumo = {
  id: number
  nombre: string
  presentacion: string
  categoria: string
  ubicacion: string | null
  stock: number
  stockMinimo: number | null
  seControla: boolean
}

type Ubicacion = { id: number; nombre: string }

export default function MinimosInsumos({
  insumos,
  ubicaciones,
}: {
  insumos: Insumo[]
  ubicaciones: Ubicacion[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  // Arranca en reactivos: son los que frenan un ensayo si faltan. Los 117 de
  // vidrio rara vez necesitan un mínimo.
  const [categoria, setCategoria] = useState('REACTIVO')
  const [ubicacion, setUbicacion] = useState('')
  const [soloSinMinimo, setSoloSinMinimo] = useState(false)
  // Lo tipeado va como texto para poder distinguir "0" de "no lo toqué".
  const [valores, setValores] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)

  const filtrados = insumos.filter((i) => {
    if (categoria && i.categoria !== categoria) return false
    if (ubicacion && i.ubicacion !== ubicacion) return false
    if (soloSinMinimo && i.stockMinimo !== null) return false
    if (!search) return true
    const q = search.toLowerCase()
    return i.nombre.toLowerCase().includes(q) || i.presentacion.toLowerCase().includes(q)
  })

  const valorDe = (i: Insumo) =>
    valores[i.id] ?? (i.stockMinimo === null ? '' : String(i.stockMinimo))

  // Solo se manda lo que efectivamente cambió: así guardar no pisa con un mismo
  // valor los 187 y no ensucia el listado de avisos.
  const cambios = insumos
    .filter((i) => valores[i.id] !== undefined)
    .map((i) => {
      const t = (valores[i.id] ?? '').trim()
      const n = t === '' ? null : Number(t.replace(',', '.'))
      return { insumoId: i.id, stockMinimo: n, original: i.stockMinimo }
    })
    .filter((c) => c.stockMinimo === null || Number.isFinite(c.stockMinimo))
    .filter((c) => c.stockMinimo !== c.original)

  async function guardar() {
    if (cambios.length === 0) return
    setLoading(true)
    const res = await fetch('/api/insumos/minimos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minimos: cambios.map(({ insumoId, stockMinimo }) => ({ insumoId, stockMinimo })),
      }),
    })
    setLoading(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setAviso({ texto: d.error || 'No se pudo guardar', error: true })
      return
    }
    setValores({})
    setAviso({
      texto: d.avisos?.length
        ? `${d.guardados} mínimos guardados. Ya estaban en falta: se crearon ${d.avisos.length} tarea(s) de reposición.`
        : `${d.guardados} mínimos guardados.`,
      error: false,
    })
    router.refresh()
  }

  const sinMinimo = insumos.filter((i) => i.stockMinimo === null).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar insumo..."
          className="flex-1 min-w-52 border rounded-lg px-3 py-2 text-base"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border rounded-lg px-3 py-2 text-base"
        >
          <option value="REACTIVO">Reactivos</option>
          <option value="VIDRIO">Material de vidrio</option>
          <option value="">Todo</option>
        </select>
        <select
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="border rounded-lg px-3 py-2 text-base"
        >
          <option value="">Toda ubicación</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.nombre}>{u.nombre}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSoloSinMinimo((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border ${
            soloSinMinimo
              ? 'bg-brand-mustard text-white border-brand-mustard'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Sin mínimo ({sinMinimo})
        </button>
      </div>

      {aviso && (
        <div
          className={`rounded-xl border p-4 ${
            aviso.error
              ? 'bg-brand-mustard/10 border-brand-mustard/40 text-brand-mustard-dark'
              : 'bg-brand-green-light border-brand-green text-brand-green-dark'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Insumo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Ubicación</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Stock</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => {
              const texto = valorDe(i).trim()
              const n = texto === '' ? null : Number(texto.replace(',', '.'))
              // Se avisa mientras se tipea: fijar este mínimo deja el insumo en
              // falta ahora mismo, y conviene verlo antes de guardar.
              const quedaraEnFalta =
                i.seControla && n !== null && Number.isFinite(n) && i.stock <= n
              return (
                <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-800">{i.nombre}</span>
                    {i.presentacion && <span className="text-gray-400"> · {i.presentacion}</span>}
                    {!i.seControla && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {ETIQUETA_ESTADO[estadoInsumo(i)]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{i.ubicacion || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatearNumero(i.stock)}</td>
                  <td className="px-3 py-2">
                    <input
                      value={valorDe(i)}
                      onChange={(e) => setValores((v) => ({ ...v, [i.id]: e.target.value }))}
                      inputMode="decimal"
                      placeholder="—"
                      className={`w-full border rounded-lg px-3 py-2 text-base text-right ${
                        quedaraEnFalta ? 'border-brand-mustard bg-brand-mustard/10' : ''
                      }`}
                      title={quedaraEnFalta ? 'Con este mínimo, el insumo queda en falta' : undefined}
                    />
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  No hay insumos que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          {filtrados.length} en pantalla
          {cambios.length > 0 && ` · ${cambios.length} sin guardar`}
        </p>
        <button
          onClick={guardar}
          disabled={loading || cambios.length === 0}
          className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Guardar mínimos
        </button>
      </div>
    </div>
  )
}
