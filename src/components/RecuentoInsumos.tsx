'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateOnly, todayISO } from '@/lib/utils'
import { formatearNumero, redondear } from '@/lib/inventario'
import { buildPlanillaHTML } from '@/lib/planillaRecuento'

type Insumo = {
  id: number
  nombre: string
  presentacion: string
  ubicacion: string | null
  stock: number
  seControla: boolean
  ultimoRecuento: Date | string | null
}

type Ubicacion = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }

type Resultado = {
  contados: number
  sinDiferencia: number
  diferencias: { nombre: string; esperado: number; contado: number }[]
}

export default function RecuentoInsumos({
  insumos,
  ubicaciones,
  analistas,
}: {
  insumos: Insumo[]
  ubicaciones: Ubicacion[]
  analistas: Analista[]
}) {
  const router = useRouter()
  const [ubicacion, setUbicacion] = useState('')
  const [analista, setAnalista] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  // Lo contado se guarda como texto: hay que poder distinguir "0" (conté y no
  // hay ninguno) de "" (no lo miré), y un number no deja hacerlo.
  const [contado, setContado] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  // La planilla en papel: a ciegas por defecto. Ver el numero del sistema
  // hace que quien cuenta lo confirme en vez de contar.
  const [aCiegas, setACiegas] = useState(true)
  const [empresa, setEmpresa] = useState('Laboratorio SFA')

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => setEmpresa(d.empresa || 'Laboratorio SFA'))
      .catch(() => {})
  }, [])

  const delLugar = ubicacion ? insumos.filter((i) => i.ubicacion === ubicacion) : []

  function cambiar(id: number, valor: string) {
    setContado((c) => ({ ...c, [id]: valor }))
  }

  function elegirUbicacion(v: string) {
    setUbicacion(v)
    setContado({})
    setResultado(null)
    setError('')
  }

  const conteos = delLugar
    .map((i) => ({ insumo: i, texto: (contado[i.id] ?? '').trim() }))
    .filter((c) => c.texto !== '')
    .map((c) => ({ insumoId: c.insumo.id, contado: Number(c.texto.replace(',', '.')) }))
    .filter((c) => Number.isFinite(c.contado) && c.contado >= 0)

  const conDiferencia = delLugar.filter((i) => {
    const t = (contado[i.id] ?? '').trim()
    if (!t) return false
    const n = Number(t.replace(',', '.'))
    return Number.isFinite(n) && redondear(n) !== redondear(i.stock)
  }).length

  // Si hay una ubicación elegida se imprime esa; si no, todo el laboratorio,
  // con una hoja por puerta para hacer la recorrida completa.
  function imprimirPlanilla() {
    const filas = ubicacion ? delLugar : insumos
    if (filas.length === 0) return setError('No hay insumos para imprimir')

    // Con tamaño explícito: sin él, la app de escritorio abre la ventana hija
    // con lo que le parece, y la hoja se arma sobre un ancho impredecible.
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) return setError('El navegador bloqueó la ventana de impresión')
    w.document.write(
      buildPlanillaHTML(filas, {
        empresa,
        fecha: formatDateOnly(`${fecha}T00:00:00.000Z`),
        aCiegas,
        ordenUbicaciones: ubicaciones.map((u) => u.nombre),
      }),
    )
    w.document.close()
    w.focus()

    // Se espera a que el documento esté armado en vez de contar 400 ms: la
    // planilla completa son 18 hojas, y si el diálogo se abría antes de que el
    // navegador terminara de aplicar el CSS, el `@page { size: A4 }` no estaba
    // puesto todavía y salía en el tamaño de papel por defecto de la impresora.
    const abrirDialogo = () => w.print()
    if (w.document.readyState === 'complete') abrirDialogo()
    else w.addEventListener('load', abrirDialogo, { once: true })
  }

  async function guardar() {
    if (conteos.length === 0) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/insumos/recuento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ubicacion, analista: analista || undefined, fecha, conteos }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return setError(d.error || 'No se pudo guardar el recuento')
    }
    setResultado(await res.json())
    setContado({})
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-52">
          <label className="text-sm font-medium text-gray-700">Ubicación *</label>
          <select
            value={ubicacion}
            onChange={(e) => elegirUbicacion(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
          >
            <option value="">Elegí una ubicación...</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.nombre}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Analista</label>
          <select
            value={analista}
            onChange={(e) => setAnalista(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-base"
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
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-base"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-sm text-gray-600" title="Contar sin ver lo que dice el sistema">
            <input type="checkbox" checked={aCiegas} onChange={(e) => setACiegas(e.target.checked)} />
            A ciegas
          </label>
          <button
            type="button"
            onClick={imprimirPlanilla}
            className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"
          >
            {ubicacion ? 'Imprimir planilla' : 'Imprimir todo'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Sin elegir ubicación, la planilla sale con todo el laboratorio, una hoja por puerta. Con
        &ldquo;a ciegas&rdquo; no se imprime el stock del sistema: quien cuenta no lo confirma, lo cuenta.
      </p>

      {resultado && (
        <div className="rounded-xl border p-4 bg-brand-green-light border-brand-green text-brand-green-dark">
          <p className="font-semibold">
            Recuento guardado: {resultado.contados} contados, {resultado.sinDiferencia} sin diferencia.
          </p>
          {resultado.diferencias.length > 0 ? (
            <ul className="mt-2 text-sm space-y-0.5">
              {resultado.diferencias.map((d) => (
                <li key={d.nombre}>
                  {d.nombre}: decía {formatearNumero(d.esperado)}, contaste {formatearNumero(d.contado)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm mt-1">Todo coincidía.</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark">
          {error}
        </div>
      )}

      {ubicacion && (
        <>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Insumo</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Último recuento</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Debería haber</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Conté</th>
                </tr>
              </thead>
              <tbody>
                {delLugar.map((i) => {
                  const texto = (contado[i.id] ?? '').trim()
                  const n = texto ? Number(texto.replace(',', '.')) : null
                  const difiere = n !== null && Number.isFinite(n) && redondear(n) !== redondear(i.stock)
                  return (
                    <tr key={i.id} className={`border-b last:border-0 ${difiere ? 'bg-brand-mustard/10' : ''}`}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-800">{i.nombre}</span>
                        {i.presentacion && <span className="text-gray-400"> · {i.presentacion}</span>}
                        {!i.seControla && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            no se contaba
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {i.ultimoRecuento ? formatDateOnly(i.ultimoRecuento) : 'nunca'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{formatearNumero(i.stock)}</td>
                      <td className="px-3 py-2">
                        <input
                          value={contado[i.id] ?? ''}
                          onChange={(e) => cambiar(i.id, e.target.value)}
                          inputMode="decimal"
                          placeholder="—"
                          className="w-full border rounded-lg px-3 py-2 text-base text-right"
                        />
                      </td>
                    </tr>
                  )
                })}
                {delLugar.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No hay insumos en esta ubicación
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              {conteos.length} de {delLugar.length} contados
              {conDiferencia > 0 && ` · ${conDiferencia} con diferencia`}
            </p>
            <button
              onClick={guardar}
              disabled={loading || conteos.length === 0}
              className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar recuento
            </button>
          </div>
        </>
      )}
    </div>
  )
}
