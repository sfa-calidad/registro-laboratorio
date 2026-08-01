'use client'
import { useMemo, useState } from 'react'
import { formatDateOnly, todayISO } from '@/lib/utils'
import { fueraDeRango, materiaGrasa, parseNumero, textoDesvio, type Rango } from '@/lib/calculos'
import type { InformeTanque } from '@/lib/informe'

// Análisis del camión que entra a planta. Cuelga del ingreso ya cargado, así que
// el origen, el remito y el producto no se retipean: se muestran y se copian al
// informe.

export type Parametro = {
  id: number
  nombre: string
  metodo: string | null
  abreviatura: string | null
  unidad: string | null
  decimales: number
  orden: number
}
export type Perfil = { producto: string; parametroId: number; orden: number }
export type Especificacion = { producto: string; parametroId: number; min: number | null; max: number | null }
export type Analista = { id: number; nombre: string; apellido: string }

export type IngresoParaAnalisis = {
  id: number
  hrRemito: string
  fecha: Date | string
  origen: string
  producto1: string
  operador: string | null
  analisis: {
    id: number
    fecha: Date | string
    producto: string
    cisternas: string | null
    ordenCompra: string | null
    analista: string | null
    comentario: string | null
    resultados: { parametroId: number; valor: number | null; valorTexto: string | null }[]
  } | null
}

// El nombre de la materia grasa en el catálogo. Es el único parámetro que la
// app calcula en vez de pedir: se identifica por nombre porque el id cambia
// entre entornos.
const MATERIA_GRASA = /materia\s*grasa/i
const HUMEDAD = /humedad/i
const INSOLUBLES = /insolubl/i

export function etiquetaParametro(p: Parametro): string {
  if (p.abreviatura) return p.abreviatura
  return p.metodo ? `${p.nombre} · ${p.metodo}` : p.nombre
}

function nombreLargo(p: Parametro): string {
  return p.metodo ? `${p.nombre} · ${p.metodo}` : p.nombre
}

export function textoSpec(e: Especificacion | undefined, decimales: number): string {
  if (!e) return '—'
  const n = (v: number) => v.toFixed(decimales).replace('.', ',')
  if (e.min !== null && e.max !== null) return `${n(e.min)} a ${n(e.max)}`
  if (e.max !== null) return `máx. ${n(e.max)}`
  if (e.min !== null) return `mín. ${n(e.min)}`
  return '—'
}

// Una sola función arma el informe, la use el formulario (con lo que se está
// tipeando) o el listado (con lo ya guardado). Si hubiera dos, la banda de
// desvío terminaría diciendo una cosa al guardar y otra al reabrir.
export type FilaInforme = { parametro: Parametro; valor: number | null; texto: string | null }

export function construirInforme(args: {
  config: { empresa: string; logo: string }
  fecha: string | Date
  producto: string
  origen: string
  hrRemito: string
  ordenCompra?: string | null
  cisternas?: string | null
  analista?: string | null
  comentario?: string | null
  filas: FilaInforme[]
  especificaciones: Especificacion[]
}): InformeTanque {
  const espec = (parametroId: number) =>
    args.especificaciones.find((e) => e.producto === args.producto && e.parametroId === parametroId)
  const rango = (parametroId: number): Rango | undefined => {
    const e = espec(parametroId)
    return e ? { min: e.min, max: e.max } : undefined
  }

  const identificacion: [string, string][] = [
    ['Fecha', formatDateOnly(args.fecha)],
    ['Producto', args.producto],
    ['Origen', args.origen],
    ['HR / Remito', args.hrRemito],
  ]
  if (args.ordenCompra) identificacion.push(['Orden de compra', args.ordenCompra])
  if (args.cisternas) identificacion.push(['Cisternas', args.cisternas])
  if (args.analista) identificacion.push(['Analista', args.analista])

  const desvios = args.filas
    .map(({ parametro, valor }) => {
      const r = rango(parametro.id)
      if (valor === null || !r || !fueraDeRango(valor, r)) return null
      return textoDesvio(nombreLargo(parametro), valor, r, parametro.unidad, parametro.decimales)
    })
    .filter((d): d is string => d !== null)

  const ahora = new Date()
  return {
    empresa: args.config.empresa,
    logo: args.config.logo,
    titulo: 'Informe de análisis de materia prima',
    identificacion,
    resultados: args.filas
      .map(({ parametro, valor, texto }) => {
        // Hay ensayos que no dan número: "27/3" se informa OK o no OK. Van
        // igual al informe, sin comparar contra rango.
        if (valor === null) {
          if (!texto) return null
          return { etiqueta: nombreLargo(parametro), valor: texto, unidad: '', spec: '—', fueraDeSpec: false }
        }
        return {
          etiqueta: nombreLargo(parametro),
          valor: valor.toFixed(parametro.decimales).replace('.', ','),
          unidad: parametro.unidad ?? '',
          spec: textoSpec(espec(parametro.id), parametro.decimales),
          fueraDeSpec: fueraDeRango(valor, rango(parametro.id)),
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
    comentario: args.comentario ?? '',
    pie: `Generado el ${ahora.toLocaleDateString('es-AR')} a las ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`,
    desvios,
  }
}

export default function AnalisisMateriaPrimaModal({
  ingreso,
  parametros,
  perfiles,
  especificaciones,
  analistas,
  config,
  onCerrar,
  onGuardado,
  onAviso,
  onVerInforme,
}: {
  ingreso: IngresoParaAnalisis
  parametros: Parametro[]
  perfiles: Perfil[]
  especificaciones: Especificacion[]
  analistas: Analista[]
  config: { empresa: string; logo: string }
  onCerrar: () => void
  onGuardado: () => void
  onAviso: (texto: string, error?: boolean) => void
  onVerInforme: (informe: InformeTanque, nombre: string) => void
}) {
  const previo = ingreso.analisis
  const [form, setForm] = useState({
    fecha: previo ? new Date(previo.fecha).toISOString().split('T')[0] : todayISO(),
    cisternas: previo?.cisternas ?? '',
    ordenCompra: previo?.ordenCompra ?? '',
    analista: previo?.analista ?? ingreso.operador ?? '',
    comentario: previo?.comentario ?? '',
  })
  const [valores, setValores] = useState<Record<number, string>>(() => {
    const v: Record<number, string> = {}
    for (const r of previo?.resultados ?? []) {
      v[r.parametroId] = r.valorTexto ?? (r.valor !== null ? String(r.valor).replace('.', ',') : '')
    }
    return v
  })
  const [guardando, setGuardando] = useState(false)

  const producto = previo?.producto ?? ingreso.producto1

  // Los parámetros que se muestran salen del perfil del producto, igual que en
  // análisis de tanque. Si el producto no tiene perfil, se muestran los que ya
  // tengan valor cargado para no esconder nada.
  const visibles = useMemo(() => {
    const porId = new Map(parametros.map((p) => [p.id, p]))
    const delPerfil = perfiles
      .filter((pf) => pf.producto === producto)
      .sort((a, b) => a.orden - b.orden)
      .map((pf) => porId.get(pf.parametroId))
      .filter((p): p is Parametro => !!p)
    const extras = Object.keys(valores)
      .map((id) => porId.get(Number(id)))
      .filter((p): p is Parametro => !!p && !delPerfil.some((d) => d.id === p.id))
    return [...delPerfil, ...extras]
  }, [parametros, perfiles, producto, valores])

  const especDe = (parametroId: number): Especificacion | undefined =>
    especificaciones.find((e) => e.producto === producto && e.parametroId === parametroId)

  const rangoDe = (parametroId: number): Rango | undefined => {
    const e = especDe(parametroId)
    return e ? { min: e.min, max: e.max } : undefined
  }

  // La materia grasa no se carga: sale de 100 − mayor(insolubles) − humedad,
  // como en la planilla.
  const paramMateriaGrasa = visibles.find((p) => MATERIA_GRASA.test(p.nombre))
  const grasaCalculada = useMemo(() => {
    const humedades = visibles.filter((p) => HUMEDAD.test(p.nombre)).map((p) => parseNumero(valores[p.id] ?? ''))
    const insolubles = visibles.filter((p) => INSOLUBLES.test(p.nombre)).map((p) => parseNumero(valores[p.id] ?? ''))
    const humedad = humedades.filter((h): h is number => h !== null)
    // Si hay más de una humedad cargada se usa la mayor, que es lo que hace la
    // planilla cuando conviven Karl Fischer y termobalanza.
    return materiaGrasa(humedad.length ? Math.max(...humedad) : null, insolubles)
  }, [visibles, valores])

  function valorDe(p: Parametro): number | null {
    if (paramMateriaGrasa && p.id === paramMateriaGrasa.id) return grasaCalculada
    return parseNumero(valores[p.id] ?? '')
  }

  const filas: FilaInforme[] = visibles.map((p) => ({
    parametro: p,
    valor: valorDe(p),
    texto: (valores[p.id] ?? '').trim() || null,
  }))

  function armarInforme(): InformeTanque {
    return construirInforme({
      config,
      fecha: form.fecha,
      producto,
      origen: ingreso.origen,
      hrRemito: ingreso.hrRemito,
      ordenCompra: form.ordenCompra,
      cisternas: form.cisternas,
      analista: form.analista,
      comentario: form.comentario,
      filas,
      especificaciones,
    })
  }

  // Los desvíos que se muestran en el formulario son exactamente los que va a
  // llevar el informe.
  const desvios = armarInforme().desvios ?? []

  const nombreArchivo = `analisis-${form.fecha}-${ingreso.hrRemito}`.replace(/[^\w.-]+/g, '-')

  async function guardar(verInforme: boolean) {
    if (guardando) return
    setGuardando(true)
    const resultados = visibles
      .map((p) => {
        const v = valorDe(p)
        const texto = (valores[p.id] ?? '').trim()
        if (v !== null) return { parametroId: p.id, valor: v, valorTexto: null }
        // Lo que no es numérico se guarda como texto: el ensayo "27/3" se
        // informa OK o no OK, no con un número.
        if (texto) return { parametroId: p.id, valor: null, valorTexto: texto }
        return null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const payload = {
      ingresoId: ingreso.id,
      fecha: form.fecha,
      producto,
      cisternas: form.cisternas || undefined,
      ordenCompra: form.ordenCompra || undefined,
      analista: form.analista || undefined,
      comentario: form.comentario || undefined,
      resultados,
    }
    const url = previo ? `/api/analisis-materia-prima/${previo.id}` : '/api/analisis-materia-prima'
    const res = await fetch(url, {
      method: previo ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setGuardando(false)

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      onAviso(err?.error || 'No se pudo guardar el análisis', true)
      return
    }
    const informe = armarInforme()
    onGuardado()
    onCerrar()
    if (verInforme) onVerInforme(informe, nombreArchivo)
    else onAviso('Análisis guardado')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800">Análisis de materia prima</h3>
          <p className="text-sm text-gray-500 mt-0.5">Ingreso #{ingreso.id} · se informa al proveedor apenas se cierra</p>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* Lo que viene del ingreso no se retipea. */}
          <div className="rounded-xl border border-brand-green bg-brand-green-light p-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Dato k="Origen" v={ingreso.origen} />
            <Dato k="HR / Remito" v={ingreso.hrRemito} />
            <Dato k="Producto" v={producto} />
            <Dato k="Fecha de ingreso" v={formatDateOnly(ingreso.fecha)} />
            <p className="col-span-2 md:col-span-4 text-xs text-brand-green-dark border-t border-brand-green/30 pt-2">
              Estos datos vienen del ingreso ya cargado. No se retipean.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Campo label="Fecha del análisis">
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </Campo>
            <Campo label="Orden de compra">
              <input value={form.ordenCompra} onChange={(e) => setForm({ ...form, ordenCompra: e.target.value })}
                placeholder="10000212" className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </Campo>
            <Campo label="Cisternas">
              <input value={form.cisternas} onChange={(e) => setForm({ ...form, cisternas: e.target.value })}
                placeholder="2" className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </Campo>
            <Campo label="Analista">
              <select value={form.analista} onChange={(e) => setForm({ ...form, analista: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                <option value="">— Sin indicar —</option>
                {analistas.map((a) => (
                  <option key={a.id} value={`${a.nombre} ${a.apellido}`}>{a.nombre} {a.apellido}</option>
                ))}
              </select>
            </Campo>
          </div>

          {visibles.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              El producto <b>{producto}</b> no tiene parámetros configurados. Se cargan en Configuración → Perfiles.
            </p>
          ) : (
            <table className="w-full text-base">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Parámetro</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Resultado</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Especificación</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const esCalculado = !!paramMateriaGrasa && p.id === paramMateriaGrasa.id
                  const v = valorDe(p)
                  const malo = fueraDeRango(v, rangoDe(p.id))
                  return (
                    <tr key={p.id} className={`border-b last:border-0 ${esCalculado ? 'bg-gray-50' : ''}`}>
                      <td className="px-3 py-2">
                        {nombreLargo(p)}
                        {esCalculado && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-green-light text-brand-green-dark border border-brand-green">
                            la calcula la app
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {esCalculado ? (
                          <span className="text-lg font-bold text-brand-dark">
                            {grasaCalculada === null ? '—' : grasaCalculada.toFixed(p.decimales).replace('.', ',')}
                          </span>
                        ) : (
                          <input
                            value={valores[p.id] ?? ''}
                            onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
                            inputMode="decimal"
                            className={`w-28 border rounded-lg px-2 py-1.5 text-base text-right ${
                              malo ? 'border-brand-red bg-red-50 text-brand-red font-bold' : ''
                            }`}
                          />
                        )}
                        {p.unidad && <span className="text-sm text-gray-500 ml-1.5">{p.unidad}</span>}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{textoSpec(especDe(p.id), p.decimales)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {paramMateriaGrasa && grasaCalculada !== null && (
            <p className="text-xs text-gray-400 mt-2 px-3 font-mono">
              materia grasa = 100 − mayor(insolubles) − humedad = {grasaCalculada.toFixed(2).replace('.', ',')}
            </p>
          )}

          {desvios.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 border border-brand-red px-4 py-3 text-sm text-brand-red-dark">
              <b>Fuera de especificación:</b>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {desvios.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <p className="mt-2 text-xs">El informe va a salir con el desvío arriba de todo.</p>
            </div>
          )}

          <div className="mt-5">
            <Campo label="Comentario">
              <textarea rows={2} value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </Campo>
          </div>

        </div>

        <div className="p-5 border-t flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <span className="mr-auto text-sm text-gray-500">
            {form.ordenCompra ? `Especificación del producto ${producto}` : 'Especificación general del producto'}
          </span>
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => guardar(false)} disabled={guardando}
            className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => guardar(true)} disabled={guardando}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-50">
            Guardar y ver informe
          </button>
        </div>
      </div>
    </div>
  )
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-brand-green-dark">{k}</div>
      <div className="text-base font-bold text-brand-dark">{v}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
