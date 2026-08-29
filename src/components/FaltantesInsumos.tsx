'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ETIQUETA_ESTADO, formatearNumero } from '@/lib/inventario'
import { buildFaltantesHTML } from '@/lib/informeFaltantes'
import { formatDateOnly } from '@/lib/utils'
import type { FilaFaltante } from '@/lib/faltantes'

export default function FaltantesInsumos({ filas }: { filas: FilaFaltante[] }) {
  const [empresa, setEmpresa] = useState('Laboratorio SFA')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)
  const [tareaId, setTareaId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => setEmpresa(d.empresa || 'Laboratorio SFA'))
      .catch(() => {})
  }, [])

  function imprimir() {
    if (filas.length === 0) return
    // Con tamaño explícito y esperando a que el documento esté armado: es lo que
    // hizo falta para que la planilla de recuento saliera bien desde la app de
    // escritorio. Ver src/lib/informeFaltantes.ts.
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) return setAviso({ texto: 'El navegador bloqueó la ventana de impresión', error: true })
    w.document.write(
      buildFaltantesHTML(filas, { empresa, fecha: formatDateOnly(new Date()) }),
    )
    w.document.close()
    w.focus()
    const abrirDialogo = () => w.print()
    if (w.document.readyState === 'complete') abrirDialogo()
    else w.addEventListener('load', abrirDialogo, { once: true })
  }

  async function crearTarea() {
    setLoading(true)
    setAviso(null)
    const res = await fetch('/api/insumos/faltantes/tarea', { method: 'POST' })
    setLoading(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setAviso({ texto: d.error || 'No se pudo crear la tarea', error: true })
    setTareaId(d.id)
    setAviso({ texto: `Se creó "${d.titulo}" con ${d.items} ítems en el tablero.`, error: false })
  }

  const sinStock = filas.filter((f) => f.estado === 'SIN_STOCK').length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
        <p className="flex-1 min-w-52 text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{filas.length}</span> a reponer
          {sinStock > 0 && (
            <span className="text-brand-red-dark"> · {sinStock} en cero</span>
          )}
        </p>
        <button
          type="button"
          onClick={imprimir}
          disabled={filas.length === 0}
          className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = '/api/insumos/faltantes/export' }}
          disabled={filas.length === 0}
          className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Exportar
        </button>
        <button
          type="button"
          onClick={crearTarea}
          disabled={loading || filas.length === 0}
          className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Crear tarea en el tablero
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
          {tareaId && !aviso.error && (
            <Link href="/tareas" className="underline ml-2 font-medium">
              Ver el tablero
            </Link>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Insumo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Ubicación</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Hay</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Mínimo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-800">{f.nombre}</span>
                  {f.presentacion && <span className="text-gray-400"> · {f.presentacion}</span>}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">{f.ubicacion || '—'}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {formatearNumero(f.stock)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">
                  {f.stockMinimo === null ? '—' : formatearNumero(f.stockMinimo)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-white ${
                      f.estado === 'SIN_STOCK' ? 'bg-brand-red' : 'bg-brand-mustard'
                    }`}
                  >
                    {ETIQUETA_ESTADO[f.estado]}
                  </span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  No falta nada: todo está por encima de su mínimo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
