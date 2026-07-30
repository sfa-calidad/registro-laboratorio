'use client'
import { useState, useEffect } from 'react'
import { formatDate, formatDateOnly, todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { buildInformeHTML, buildInformeSVG, type InformeTanque } from '@/lib/informe'

type Producto = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }
type Parametro = {
  id: number
  nombre: string
  metodo: string | null
  abreviatura: string | null
  unidad: string | null
  decimales: number
  orden: number
  activo: boolean
}
type Perfil = { id: number; producto: string; parametroId: number; orden: number }
type Especificacion = { id: number; producto: string; parametroId: number; min: number | null; max: number | null }
type Resultado = { parametroId: number; valor: number | null; valorTexto: string | null; parametro: Parametro }
type Analisis = {
  id: number
  fecha: Date | string
  producto: string
  tanques: string
  alturaM: number | null
  referencia: string | null
  conjuntoHaciaArriba: boolean
  analista: string | null
  comentario: string | null
  resultados: Resultado[]
}

const REFERENCIAS = [
  { value: 'AF', label: 'AF — antes del fondo' },
  { value: 'DS', label: 'DS — desde la superficie' },
  { value: 'AC', label: 'AC — antes del cono' },
]

// Parámetros que van como columnas fijas en la tabla (los más usados).
const COLUMNAS_TABLA = ['Hum. TB', 'Hum. KF', 'Ins. HEX.', 'Ins. ACET.', 'Acidez (como ác. oleico)', 'Fósforo']

const emptyForm = {
  fecha: '',
  producto: '',
  tanques: '',
  alturaM: '',
  referencia: '',
  conjuntoHaciaArriba: false,
  analista: '',
  comentario: '',
}

// La altura nunca se muestra sin su referencia (2 m AF y 2 m DS son puntos
// distintos del tanque), y el conjunto HA siempre lleva la flecha ↑.
function formatAltura(alturaM: number | string | null, referencia: string | null, ha: boolean): string {
  const partes: string[] = []
  if (alturaM !== null && alturaM !== '') partes.push(`${String(alturaM).replace('.', ',')} m${referencia ? ` ${referencia}` : ''}`)
  if (ha) partes.push('↑')
  return partes.join(' ')
}

function etiquetaParametro(p: Parametro): string {
  if (p.abreviatura) return p.abreviatura
  return p.metodo ? `${p.nombre} (${p.metodo})` : p.nombre
}

// Acepta coma o punto decimal; devuelve null si no es numérico.
function parseNumero(s: string): number | null {
  const limpio = s.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null
  return Number(limpio)
}

export default function AnalisisTanqueList({
  analisis,
  productos,
  analistas,
  parametros,
  perfiles,
  especificaciones,
}: {
  analisis: Analisis[]
  productos: Producto[]
  analistas: Analista[]
  parametros: Parametro[]
  perfiles: Perfil[]
  especificaciones: Especificacion[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [valores, setValores] = useState<Record<number, string>>({})
  const [extraParamIds, setExtraParamIds] = useState<number[]>([])
  const [agregarParamId, setAgregarParamId] = useState('')
  const [showGlosario, setShowGlosario] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [informeDe, setInformeDe] = useState<Analisis | null>(null)
  const [config, setConfig] = useState({ empresa: 'Laboratorio SFA', logo: '' })
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)
  // Compartir con archivos existe en Windows y Android, no en todos lados; el
  // botón solo aparece donde funciona. Se resuelve en el cliente.
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [puedeCopiar, setPuedeCopiar] = useState(false)

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => setConfig({ empresa: d.empresa || 'Laboratorio SFA', logo: d.logo || '' }))
      .catch(() => {})

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPuedeCopiar(typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write)
    try {
      const prueba = new File([''], 'informe.png', { type: 'image/png' })
      setPuedeCompartir(!!navigator.canShare?.({ files: [prueba] }))
    } catch {
      setPuedeCompartir(false)
    }
  }, [])

  function avisar(texto: string, error = false) {
    setAviso({ texto, error })
    setTimeout(() => setAviso(null), 5000)
  }

  const paramById = new Map(parametros.map((p) => [p.id, p]))

  // Parámetros visibles en el formulario: el perfil del producto + los
  // agregados a mano para esta carga puntual.
  function paramsDelFormulario(): Parametro[] {
    const delPerfil = perfiles
      .filter((pf) => pf.producto === form.producto)
      .sort((a, b) => a.orden - b.orden)
      .map((pf) => paramById.get(pf.parametroId))
      .filter((p): p is Parametro => !!p)
    const extras = extraParamIds
      .map((id) => paramById.get(id))
      .filter((p): p is Parametro => !!p && !delPerfil.some((d) => d.id === p.id))
    return [...delPerfil, ...extras]
  }

  function especDe(producto: string, parametroId: number): Especificacion | undefined {
    return especificaciones.find((e) => e.producto === producto && e.parametroId === parametroId)
  }

  function fueraDeSpec(producto: string, parametroId: number, valor: number | null): boolean {
    if (valor === null) return false
    const e = especDe(producto, parametroId)
    if (!e) return false
    return (e.min !== null && valor < e.min) || (e.max !== null && valor > e.max)
  }

  const filtered = analisis.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.producto.toLowerCase().includes(q) ||
      a.tanques.toLowerCase().includes(q) ||
      (a.analista || '').toLowerCase().includes(q)
    )
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const columnasTabla = COLUMNAS_TABLA
    .map((et) => parametros.find((p) => etiquetaParametro(p) === et || p.nombre === et))
    .filter((p): p is Parametro => !!p)

  function openNew() {
    setEditingId(null)
    setForm({ ...emptyForm, fecha: todayISO() })
    setValores({})
    setExtraParamIds([])
    setShowForm(true)
  }

  function openEdit(a: Analisis) {
    setEditingId(a.id)
    setForm({
      fecha: new Date(a.fecha).toISOString().split('T')[0],
      producto: a.producto,
      tanques: a.tanques,
      alturaM: a.alturaM !== null ? String(a.alturaM) : '',
      referencia: a.referencia || '',
      conjuntoHaciaArriba: a.conjuntoHaciaArriba,
      analista: a.analista || '',
      comentario: a.comentario || '',
    })
    const vals: Record<number, string> = {}
    for (const r of a.resultados) vals[r.parametroId] = r.valorTexto ?? (r.valor !== null ? String(r.valor) : '')
    setValores(vals)
    // Lo cargado que no está en el perfil del producto entra como extra.
    const delPerfil = new Set(perfiles.filter((pf) => pf.producto === a.producto).map((pf) => pf.parametroId))
    setExtraParamIds(a.resultados.map((r) => r.parametroId).filter((id) => !delPerfil.has(id)))
    setShowForm(true)
  }

  function openDuplicate(a: Analisis) {
    openEdit(a)
    setEditingId(null)
    setForm((f) => ({ ...f, fecha: todayISO() }))
  }

  // Arma el informe con TODOS los parámetros cargados, no solo las columnas
  // fijas de la tabla. Los valores se muestran tal cual se guardaron (misma
  // convención que el listado y el CSV): el formato lo da la unidad.
  function armarInforme(a: Analisis): InformeTanque {
    const identificacion: [string, string][] = [
      ['Fecha', formatDateOnly(a.fecha)],
      ['Producto', a.producto],
      ['Tanques', a.tanques],
      ['Altura', formatAltura(a.alturaM, a.referencia, a.conjuntoHaciaArriba) || '—'],
      ['Analista', a.analista || '—'],
      ['N° de análisis', String(a.id)],
    ]

    const resultados = [...a.resultados]
      .sort((x, y) => x.parametro.orden - y.parametro.orden)
      .map((r) => {
        const espec = especDe(a.producto, r.parametroId)
        const fuera = r.valor !== null && fueraDeSpec(a.producto, r.parametroId, r.valor)
        const p = r.parametro
        return {
          etiqueta: `${p.nombre}${p.metodo ? ` · ${p.metodo}` : ''}`,
          valor: r.valorTexto ?? (r.valor !== null ? String(r.valor).replace('.', ',') : '—'),
          unidad: p.unidad || '',
          spec: espec ? `${espec.min ?? '—'} a ${espec.max ?? '—'}` : '',
          fueraDeSpec: fuera,
        }
      })

    // El momento de emisión es un timestamp real, así que fecha y hora salen
    // las dos del mismo reloj. Con formatDateOnly (componentes UTC) la fecha
    // podía ser del día siguiente y la hora del día anterior en el mismo
    // renglón de un informe que se le entrega al cliente.
    const ahora = new Date()
    const pie = `Generado el ${formatDate(ahora)} a las ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
    return {
      empresa: config.empresa,
      logo: config.logo,
      titulo: 'Informe de análisis de tanque',
      identificacion,
      resultados,
      comentario: a.comentario || '',
      pie,
    }
  }

  function nombreArchivo(a: Analisis, ext: string) {
    const fecha = new Date(a.fecha).toISOString().split('T')[0]
    const tanques = a.tanques.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return `analisis-${fecha}-${tanques}.${ext}`
  }

  function descargarPDF(a: Analisis) {
    // Se abre el informe en una ventana y se dispara el diálogo de impresión:
    // desde ahí se elige "Guardar como PDF". Mismo patrón que los rótulos, y
    // evita sumar una librería de PDF al proyecto.
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(buildInformeHTML(armarInforme(a)))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  // El informe se arma como SVG (solo texto y formas, sin foreignObject) y se
  // dibuja en un canvas para exportarlo como PNG. Todo nativo: sin SVG externo
  // el canvas no queda bloqueado y toBlob() funciona.
  function informeAPng(a: Analisis): Promise<Blob | null> {
    return new Promise((resolve) => {
      const { svg, ancho, alto } = buildInformeSVG(armarInforme(a))
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
      const img = new Image()
      img.onload = () => {
        const escala = 2 // se exporta al doble para que se lea bien al ampliar
        const canvas = document.createElement('canvas')
        canvas.width = ancho * escala
        canvas.height = alto * escala
        const ctx = canvas.getContext('2d')
        URL.revokeObjectURL(url)
        if (!ctx) return resolve(null)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.scale(escala, escala)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  }

  async function descargarImagen(a: Analisis) {
    const blob = await informeAPng(a)
    if (!blob) return avisar('No se pudo generar la imagen', true)
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = nombreArchivo(a, 'png')
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
  }

  // Deja el informe en el portapapeles como imagen: se pega directo en
  // WhatsApp Web, en un mail o en un chat, sin descargar y volver a subir.
  async function copiarImagen(a: Analisis) {
    const blob = await informeAPng(a)
    if (!blob) return avisar('No se pudo generar la imagen', true)
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      avisar('Informe copiado: pegalo en WhatsApp o en el mail con Ctrl+V')
    } catch {
      avisar('El navegador no dejó copiar la imagen. Probá con "Descargar imagen".', true)
    }
  }

  // Abre el menú de compartir del sistema (WhatsApp, mail, Drive...) con el
  // informe ya adjunto. En Windows y Android; en otros casos el botón no se
  // muestra.
  async function compartirImagen(a: Analisis) {
    const blob = await informeAPng(a)
    if (!blob) return avisar('No se pudo generar la imagen', true)
    const archivo = new File([blob], nombreArchivo(a, 'png'), { type: 'image/png' })
    try {
      await navigator.share({ files: [archivo], title: 'Informe de análisis de tanque' })
    } catch (e) {
      // Cancelar el menú de compartir no es un error que valga la pena avisar.
      if ((e as Error)?.name !== 'AbortError') {
        avisar('No se pudo compartir el informe', true)
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este análisis y sus resultados?')) return
    await fetch(`/api/analisis-tanque/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent, cargarOtro = false) {
    e.preventDefault()
    setLoading(true)
    const resultados = paramsDelFormulario()
      .map((p) => {
        const s = (valores[p.id] || '').trim()
        if (!s) return null
        const n = parseNumero(s)
        return n !== null ? { parametroId: p.id, valor: n } : { parametroId: p.id, valorTexto: s }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const payload = {
      fecha: form.fecha,
      producto: form.producto,
      tanques: form.tanques,
      alturaM: form.alturaM !== '' ? parseNumero(form.alturaM) : null,
      referencia: (form.referencia || null) as 'AF' | 'DS' | 'AC' | null,
      conjuntoHaciaArriba: form.conjuntoHaciaArriba,
      analista: form.analista || undefined,
      comentario: form.comentario || undefined,
      resultados,
    }
    const url = editingId ? `/api/analisis-tanque/${editingId}` : '/api/analisis-tanque'
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      if (cargarOtro) {
        // Se cargan muchos análisis seguidos del mismo tanque: se conservan
        // producto, tanques y fecha, y se limpia el resto.
        setEditingId(null)
        setForm((f) => ({ ...emptyForm, fecha: f.fecha, producto: f.producto, tanques: f.tanques }))
        setValores({})
        setExtraParamIds([])
        setSavedMsg('Análisis guardado. Podés cargar el siguiente.')
        setTimeout(() => setSavedMsg(''), 3000)
      } else {
        setShowForm(false)
        setForm(emptyForm)
        setValores({})
        setExtraParamIds([])
      }
      router.refresh()
    }
    setLoading(false)
  }

  const resumen = formatAltura(form.alturaM, form.referencia || null, form.conjuntoHaciaArriba)

  const paramsForm = paramsDelFormulario()

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          placeholder="Buscar por producto, tanque o analista..."
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
            + Nuevo Análisis
          </button>
        </div>
      </div>

      {showExport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3">Exportar CSV</h3>
            <p className="text-sm text-gray-500 mb-3">Dejá las fechas vacías para exportar todo.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
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
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExport(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (exportDesde) params.set('desde', exportDesde)
                  if (exportHasta) params.set('hasta', exportHasta)
                  const qs = params.toString()
                  window.location.href = `/api/analisis-tanque/export${qs ? `?${qs}` : ''}`
                  setShowExport(false)
                }}
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlosario && (
        // z-[60]: el glosario se abre desde el formulario (z-50) y tiene que
        // quedar por encima.
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowGlosario(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">¿Qué significan AF, DS, AC y HA?</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p><b>AF — antes del fondo:</b> se mide desde el fondo hacia arriba. <i>2 m AF</i> = dos metros por encima del fondo.</p>
              <p><b>DS — desde la superficie:</b> se mide desde el espejo hacia abajo. <i>2 m DS</i> = dos metros por debajo de la superficie.</p>
              <p><b>AC — antes del cono:</b> referencia para tanques de fondo cónico.</p>
              <p><b>HA — hacia arriba:</b> no es una altura ni una referencia. Indica que la muestra es un <b>conjunto</b> (un brend) tomado desde esa altura hacia arriba. <i>1 m AF ↑</i> = mezcla de 1 m AF, 2 m AF, 4 m DS, 2 m DS y superficie.</p>
              <p className="text-gray-500">Por eso la altura se muestra siempre con su referencia: 2 m AF y 2 m DS son puntos distintos del tanque.</p>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowGlosario(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={(e) => handleSubmit(e)} className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-3">{editingId ? 'Editar Análisis' : 'Nuevo Análisis de Tanque'}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
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
                <label className="text-sm font-medium text-gray-700">Tanques *</label>
                <input required value={form.tanques} onChange={(e) => setForm({ ...form, tanques: e.target.value })}
                  placeholder={'"26 + 27", "114/118/119"'}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Altura (m)</label>
                <input type="text" inputMode="decimal" value={form.alturaM}
                  onChange={(e) => setForm({ ...form, alturaM: e.target.value })}
                  placeholder="0,5"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Medida desde</label>
                <select value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">No aplica</option>
                  {REFERENCIAS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.conjuntoHaciaArriba}
                    onChange={(e) => setForm({ ...form, conjuntoHaciaArriba: e.target.checked })} />
                  Conjunto hacia arriba (HA)
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Analista</label>
                <select value={form.analista} onChange={(e) => setForm({ ...form, analista: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin analista —</option>
                  {analistas.map((a) => (
                    <option key={a.id} value={`${a.nombre} ${a.apellido}`}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Se guarda como: <b className="text-gray-700">{resumen || '—'}</b>
              </span>
              <button type="button" onClick={() => setShowGlosario(true)} className="text-brand-green-dark hover:text-brand-green underline">
                ¿Qué significan AF, DS, AC y HA?
              </button>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700 text-sm">Resultados</h4>
                <div className="flex items-center gap-1.5">
                  <select value={agregarParamId} onChange={(e) => setAgregarParamId(e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm">
                    <option value="">Elegir parámetro...</option>
                    {parametros
                      .filter((p) => !paramsForm.some((v) => v.id === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}{p.metodo ? ` · ${p.metodo}` : ''}{p.unidad ? ` (${p.unidad})` : ''}
                        </option>
                      ))}
                  </select>
                  <button type="button"
                    onClick={() => { if (agregarParamId) { setExtraParamIds((ids) => [...ids, Number(agregarParamId)]); setAgregarParamId('') } }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                    + Agregar parámetro
                  </button>
                </div>
              </div>
              {paramsForm.length === 0 && (
                <p className="text-sm text-gray-400">Elegí un producto para ver sus parámetros, o agregá uno con el selector.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {paramsForm.map((p) => {
                  const s = valores[p.id] || ''
                  const n = parseNumero(s)
                  const espec = especDe(form.producto, p.id)
                  const fuera = n !== null && fueraDeSpec(form.producto, p.id, n)
                  return (
                    <div key={p.id}>
                      <label className="text-sm font-medium text-gray-700">
                        {p.nombre}{p.metodo ? ` · ${p.metodo}` : ''}{p.unidad ? ` (${p.unidad})` : ''}
                      </label>
                      <input type="text" inputMode="decimal" value={s}
                        onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
                        className={`mt-1 w-full border rounded-lg px-3 py-2 text-base ${fuera ? 'border-brand-red ring-1 ring-brand-red text-brand-red' : ''}`} />
                      {espec && (
                        <p className={`text-xs mt-0.5 ${fuera ? 'text-brand-red' : 'text-gray-400'}`}>
                          Spec: {espec.min ?? '—'} a {espec.max ?? '—'}{fuera ? ' · fuera de especificación' : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Comentario</label>
              <textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
            </div>

            {savedMsg && <p className="text-green-600 text-sm mt-2 font-medium">✓ {savedMsg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setSavedMsg('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              {!editingId && (
                <button type="button" disabled={loading} onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                  className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light disabled:opacity-50">
                  Guardar y cargar otro
                </button>
              )}
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50">
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar Análisis'}
              </button>
            </div>
          </form>
        </div>
      )}

      {informeDe && (() => {
        const inf = armarInforme(informeDe)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setInformeDe(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 overflow-y-auto">
                {/* Con logo cargado no se repite el nombre de la empresa en
                    texto: el título queda como encabezado principal. */}
                <div className="flex items-center gap-3 border-b-4 border-brand-green pb-3 mb-4">
                  {inf.logo && <img src={inf.logo} alt={inf.empresa} className="h-12 max-w-32 object-contain" />}
                  <div>
                    {!inf.logo && <div className="text-lg font-bold text-brand-dark">{inf.empresa}</div>}
                    <div className={inf.logo ? 'text-base font-bold text-brand-dark' : 'text-sm text-gray-500'}>{inf.titulo}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
                  {inf.identificacion.map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm border-b border-gray-100 pb-1">
                      <span className="text-gray-500 min-w-28">{k}</span>
                      <span className="font-semibold text-brand-dark">{v}</span>
                    </div>
                  ))}
                </div>

                <h4 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Resultados</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <th className="text-left px-2 py-1.5 text-gray-500">Parámetro</th>
                      <th className="text-left px-2 py-1.5 text-gray-500">Resultado</th>
                      <th className="text-left px-2 py-1.5 text-gray-500">Especificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inf.resultados.map((r, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${r.fueraDeSpec ? 'text-brand-red' : ''}`}>
                        <td className="px-2 py-1.5">{r.etiqueta}{r.fueraDeSpec && ' ⚠'}</td>
                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap">
                          {r.valor}{r.unidad && <span className="font-normal text-gray-500 text-xs"> {r.unidad}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{r.spec || '—'}</td>
                      </tr>
                    ))}
                    {inf.resultados.length === 0 && (
                      <tr><td colSpan={3} className="px-2 py-3 text-gray-400">Sin resultados cargados</td></tr>
                    )}
                  </tbody>
                </table>

                {inf.comentario && (
                  <div className="mt-4 text-sm">
                    <span className="text-gray-500 block mb-1">Comentario</span>
                    <p className="bg-gray-50 border-l-4 border-gray-300 px-3 py-2 whitespace-pre-wrap">{inf.comentario}</p>
                  </div>
                )}
                <p className="mt-4 pt-2 border-t text-xs text-gray-400">{inf.pie}</p>
              </div>

              <div className="p-4 border-t flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
                <button onClick={() => setInformeDe(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg mr-auto">Cerrar</button>
                {/* Enviar sin pasar por "descargar y volver a subir": copiar
                    pega el informe en WhatsApp o en el mail con Ctrl+V, y
                    compartir abre el menú del sistema con el archivo adjunto. */}
                {puedeCopiar && (
                  <button onClick={() => copiarImagen(informeDe)}
                    className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark">
                    Copiar imagen
                  </button>
                )}
                {puedeCompartir && (
                  <button onClick={() => compartirImagen(informeDe)}
                    className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark">
                    Compartir
                  </button>
                )}
                <button onClick={() => descargarImagen(informeDe)}
                  className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light">
                  Descargar imagen
                </button>
                <button onClick={() => descargarPDF(informeDe)}
                  className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light">
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Tanques</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Altura</th>
              {columnasTabla.map((p) => (
                <th key={p.id} className="text-left px-3 py-2 font-semibold text-gray-600" title={`${p.nombre}${p.metodo ? ` · ${p.metodo}` : ''}`}>
                  {etiquetaParametro(p)}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Analista</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => {
              const porParam = new Map(a.resultados.map((r) => [r.parametroId, r]))
              return (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">{formatDateOnly(a.fecha)}</td>
                  <td className="px-3 py-2">{a.producto}</td>
                  <td className="px-3 py-2 font-mono text-sm">{a.tanques}</td>
                  <td className="px-3 py-2 text-sm">
                    {formatAltura(a.alturaM, a.referencia, a.conjuntoHaciaArriba) || '—'}
                  </td>
                  {columnasTabla.map((p) => {
                    const r = porParam.get(p.id)
                    const fuera = r && r.valor !== null && fueraDeSpec(a.producto, p.id, r.valor)
                    return (
                      <td key={p.id} className={`px-3 py-2 ${fuera ? 'text-brand-red font-semibold' : ''}`}>
                        {r ? (r.valorTexto ?? String(r.valor).replace('.', ',')) : '—'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">{a.analista || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                      <button onClick={() => setInformeDe(a)} className="text-brand-green-dark hover:text-brand-green font-medium">Ver informe</button>
                      <button onClick={() => openEdit(a)} className="text-brand-green-dark hover:text-brand-green font-medium">Editar</button>
                      <button onClick={() => openDuplicate(a)} className="text-gray-500 hover:text-gray-700 font-medium">Duplicar</button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 font-medium pl-2 border-l border-gray-200">Eliminar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7 + columnasTabla.length} className="px-3 py-6 text-center text-gray-400 text-base">
                  Sin análisis cargados
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

      {aviso && (
        <div className={`fixed bottom-4 right-4 z-[70] px-4 py-2.5 rounded-lg shadow-lg text-sm text-white animate-fade-in ${aviso.error ? 'bg-brand-red' : 'bg-brand-dark'}`}>
          {aviso.error ? '⚠️ ' : '✓ '}{aviso.texto}
        </div>
      )}
    </div>
  )
}
