'use client'
import { useState, useEffect } from 'react'
import { formatDateOnly, todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { buildLabelZPL } from '@/lib/zpl'
import { buildLabelHTML } from '@/lib/etiqueta'

type Producto = { id: number; nombre: string }
type Laboratorio = { id: number; nombre: string; esExterno: boolean; delExterior: boolean }
type Lugar = { id: number; nombre: string }
type Parametro = { id: number; nombre: string; metodo: string | null; abreviatura: string | null; unidad: string | null }
type Contacto = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }
type Ensayo = { parametroId: number | null; libre: string | null; parametro: Parametro | null }
type Muestra = {
  id: number
  numero: string
  fecha: Date | string
  producto: string
  detalle: string | null
  tipoOrigen: string | null
  identificacionOrigen: string | null
  lugarMuestreo: string | null
  contacto: string | null
  solicitadoPor: string | null
  remito: string | null
  envase: string | null
  laboratorio: string | null
  estado: string
  fechaEnvio: Date | string | null
  awb: string | null
  protocolo: string | null
  fechaResultado: Date | string | null
  resultado: string | null
  observacion: string | null
  cargadoPor: string | null
  ensayos: Ensayo[]
}

const TIPOS_ORIGEN = ['Tanque', 'Camión', 'Buque', 'Isotanque', 'Bidón', 'N/A']
// La etiqueta del campo de identificación cambia según el tipo de origen.
const LABEL_ORIGEN: Record<string, string> = {
  'Tanque': 'Identificación del tanque',
  'Camión': 'Patente / N° de camión',
  'Buque': 'Nombre del buque',
  'Isotanque': 'Identificación del isotanque',
  'Bidón': 'Identificación del bidón',
  'N/A': 'Referencia',
}

const DIAS_DEMORA = 15

const emptyForm = {
  numero: '',
  fecha: '',
  producto: '',
  detalle: '',
  tipoOrigen: '',
  identificacionOrigen: '',
  lugarMuestreo: '',
  contacto: '',
  solicitadoPor: '',
  remito: '',
  envase: '',
  laboratorio: '',
  fechaEnvio: '',
  awb: '',
  protocolo: '',
  fechaResultado: '',
  resultado: '',
  observacion: '',
  cargadoPor: '',
  anulada: false,
}

function diasDesde(fecha: Date | string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

// Una ENVIADA sin protocolo por más de 15 días está demorada: hay que
// reclamar al laboratorio.
function estaDemorada(m: Muestra): boolean {
  return m.estado === 'ENVIADA' && !m.protocolo && !!m.fechaEnvio && diasDesde(m.fechaEnvio) > DIAS_DEMORA
}

function etiquetaEnsayo(e: Ensayo): string {
  if (e.parametro) return e.parametro.abreviatura || (e.parametro.metodo ? `${e.parametro.nombre} (${e.parametro.metodo})` : e.parametro.nombre)
  return e.libre || ''
}

export default function MuestrasList({
  muestras,
  productos,
  laboratorios,
  lugares,
  parametros,
  contactos,
  analistas,
}: {
  muestras: Muestra[]
  productos: Producto[]
  laboratorios: Laboratorio[]
  lugares: Lugar[]
  parametros: Parametro[]
  contactos: Contacto[]
  analistas: Analista[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [soloSinResultado, setSoloSinResultado] = useState(false)
  const [filtroLab, setFiltroLab] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [ensayosSel, setEnsayosSel] = useState<{ parametroId?: number; libre?: string }[]>([])
  const [ensayoParamId, setEnsayoParamId] = useState('')
  const [ensayoLibre, setEnsayoLibre] = useState('')
  const [guardada, setGuardada] = useState<Muestra | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState('')
  const [exportHasta, setExportHasta] = useState('')
  const [printMsg, setPrintMsg] = useState('')
  const [config, setConfig] = useState({ etiquetaAncho: '100', etiquetaAlto: '45', etiquetaFuente: '9', empresa: 'Laboratorio SFA', logo: '' })

  useEffect(() => {
    fetch('/api/configuracion').then((r) => r.json()).then(setConfig).catch(() => {})
  }, [])

  const labSeleccionado = laboratorios.find((l) => l.nombre === form.laboratorio)
  const labsExternos = new Set(laboratorios.filter((l) => l.esExterno).map((l) => l.nombre))

  // Tarjetas de arriba: el pulso del registro en el año.
  const anio = new Date().getFullYear()
  const delAnio = muestras.filter((m) => new Date(m.fecha).getFullYear() === anio)
  const identificadasAnio = delAnio.length
  const enviadasExterno = delAnio.filter((m) => m.laboratorio && labsExternos.has(m.laboratorio) && m.fechaEnvio).length
  const sinResultado = muestras.filter((m) => m.estado !== 'CON_RESULTADO' && m.estado !== 'ANULADA').length
  const demoradas = muestras.filter(estaDemorada).length

  const filtered = muestras.filter((m) => {
    const q = search.toLowerCase()
    const matchTexto =
      m.numero.toLowerCase().includes(q) ||
      m.producto.toLowerCase().includes(q) ||
      (m.contacto || '').toLowerCase().includes(q) ||
      (m.identificacionOrigen || '').toLowerCase().includes(q) ||
      (m.protocolo || '').toLowerCase().includes(q)
    const matchSinResultado = !soloSinResultado || (m.estado !== 'CON_RESULTADO' && m.estado !== 'ANULADA')
    const matchLab = !filtroLab || m.laboratorio === filtroLab
    return matchTexto && matchSinResultado && matchLab
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function openNew() {
    setEditingId(null)
    setGuardada(null)
    setEnsayosSel([])
    const res = await fetch('/api/muestras/proximo-numero')
    const { numero } = await res.json()
    setForm({ ...emptyForm, numero, fecha: todayISO() })
    setShowForm(true)
  }

  function openEdit(m: Muestra) {
    setEditingId(m.id)
    setGuardada(m)
    setForm({
      numero: m.numero,
      fecha: new Date(m.fecha).toISOString().split('T')[0],
      producto: m.producto,
      detalle: m.detalle || '',
      tipoOrigen: m.tipoOrigen || '',
      identificacionOrigen: m.identificacionOrigen || '',
      lugarMuestreo: m.lugarMuestreo || '',
      contacto: m.contacto || '',
      solicitadoPor: m.solicitadoPor || '',
      remito: m.remito || '',
      envase: m.envase || '',
      laboratorio: m.laboratorio || '',
      fechaEnvio: m.fechaEnvio ? new Date(m.fechaEnvio).toISOString().split('T')[0] : '',
      awb: m.awb || '',
      protocolo: m.protocolo || '',
      fechaResultado: m.fechaResultado ? new Date(m.fechaResultado).toISOString().split('T')[0] : '',
      resultado: m.resultado || '',
      observacion: m.observacion || '',
      cargadoPor: m.cargadoPor || '',
      anulada: m.estado === 'ANULADA',
    })
    setEnsayosSel(m.ensayos.map((e) => (e.parametroId ? { parametroId: e.parametroId } : { libre: e.libre || '' })))
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta muestra y sus ensayos?')) return
    await fetch(`/api/muestras/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      numero: form.numero,
      fecha: form.fecha,
      producto: form.producto,
      detalle: form.detalle || undefined,
      tipoOrigen: form.tipoOrigen || undefined,
      identificacionOrigen: form.identificacionOrigen || undefined,
      lugarMuestreo: form.lugarMuestreo || undefined,
      contacto: form.contacto || undefined,
      solicitadoPor: form.solicitadoPor || undefined,
      remito: form.remito || undefined,
      envase: form.envase || undefined,
      laboratorio: form.laboratorio || undefined,
      // ANULADA es la única transición que se marca a mano; el resto de los
      // estados los deriva la API según lo cargado.
      estado: form.anulada ? ('ANULADA' as const) : undefined,
      fechaEnvio: form.fechaEnvio || null,
      awb: labSeleccionado?.delExterior ? form.awb || undefined : undefined,
      protocolo: form.protocolo || undefined,
      fechaResultado: form.fechaResultado || null,
      resultado: form.resultado || undefined,
      observacion: form.observacion || undefined,
      cargadoPor: form.cargadoPor || undefined,
      ensayos: ensayosSel,
    }
    const url = editingId ? `/api/muestras/${editingId}` : '/api/muestras'
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const m = await res.json()
      // El formulario queda abierto mostrando la muestra guardada, con el
      // botón de imprimir rótulo a mano (no se imprime solo al guardar).
      setGuardada(m)
      setEditingId(m.id)
      router.refresh()
    } else {
      const err = await res.json().catch(() => null)
      if (err?.error) setPrintMsg(typeof err.error === 'string' ? err.error : 'No se pudo guardar')
      setTimeout(() => setPrintMsg(''), 5000)
    }
    setLoading(false)
  }

  async function imprimirRotulo(m: { numero: string; producto: string; fecha: Date | string }) {
    const data = {
      numero: m.numero,
      producto: m.producto,
      fecha: formatDateOnly(m.fecha),
    }
    // Queda registrado en la pantalla de Rótulos como tipo MUESTRAS.
    fetch('/api/rotulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'MUESTRAS', data }),
    }).catch(() => {})

    const html = buildLabelHTML('MUESTRAS', data, config)
    if (window.desktopPrinter) {
      const res = await window.desktopPrinter.printLabel({
        html,
        zpl: buildLabelZPL('MUESTRAS', data, config),
        deviceName: localStorage.getItem('rotulos_impresora') || undefined,
        widthMm: Number(config.etiquetaAncho) || 100,
        heightMm: Number(config.etiquetaAlto) || 45,
      })
      setPrintMsg(res.success ? `Rótulo de la muestra ${m.numero} enviado a la impresora` : `No se pudo imprimir: ${res.failureReason}`)
      setTimeout(() => setPrintMsg(''), 4000)
    } else {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(html)
      w.document.close()
      w.focus()
      setTimeout(() => w.print(), 500)
    }
  }

  function badgeEstado(m: Muestra) {
    if (estaDemorada(m)) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-red text-white">Enviada hace {diasDesde(m.fechaEnvio!)} días</span>
    }
    switch (m.estado) {
      case 'CON_RESULTADO':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-green text-white">Con resultado</span>
      case 'ENVIADA':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-mustard text-white">Enviada</span>
      case 'EN_ANALISIS':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-mustard/80 text-white">En análisis</span>
      case 'ANULADA':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-400 line-through">Anulada</span>
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Identificada</span>
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="rounded-xl border p-4 bg-slate-50 border-slate-300 text-brand-dark">
          <p className="text-sm font-medium">Muestras {anio}</p>
          <p className="text-3xl font-bold mt-1">{identificadasAnio}</p>
        </div>
        <div className="rounded-xl border p-4 bg-amber-50 border-brand-mustard text-brand-mustard-dark">
          <p className="text-sm font-medium">Enviadas a lab. externo</p>
          <p className="text-3xl font-bold mt-1">{enviadasExterno}</p>
        </div>
        <div className="rounded-xl border p-4 bg-brand-green-light border-brand-green text-brand-green-dark">
          <p className="text-sm font-medium">Sin resultado</p>
          <p className="text-3xl font-bold mt-1">{sinResultado}</p>
        </div>
        <div className="rounded-xl border p-4 bg-red-50 border-brand-red text-brand-red-dark">
          <p className="text-sm font-medium">Demoradas &gt; {DIAS_DEMORA} días</p>
          <p className="text-3xl font-bold mt-1">{demoradas}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Buscar por número, producto, contacto, origen o protocolo..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-base w-80"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 border rounded-lg px-3 py-2 bg-white">
          <input type="checkbox" checked={soloSinResultado} onChange={(e) => { setSoloSinResultado(e.target.checked); setPage(1) }} />
          Sin resultado
        </label>
        <select value={filtroLab} onChange={(e) => { setFiltroLab(e.target.value); setPage(1) }}
          className="border rounded-lg px-2 py-2 text-sm">
          <option value="">Todos los laboratorios</option>
          {laboratorios.map((l) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowExport(true)}
            className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">
            Exportar CSV
          </button>
          <button onClick={openNew}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark">
            + Nueva Muestra
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
                  window.location.href = `/api/muestras/export${qs ? `?${qs}` : ''}`
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{editingId ? `Muestra ${form.numero}` : 'Nueva Muestra'}</h3>
              <span className="font-mono text-lg font-bold text-brand-green-dark bg-brand-green-light px-3 py-1 rounded-lg">
                N° {form.numero}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cargado por</label>
                <select value={form.cargadoPor} onChange={(e) => setForm({ ...form, cargadoPor: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin indicar —</option>
                  {analistas.map((a) => (
                    <option key={a.id} value={`${a.nombre} ${a.apellido}`}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Producto *</label>
                <select required value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Detalle</label>
                <input value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                  placeholder="Descripción breve de la muestra"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo de origen</label>
                <select value={form.tipoOrigen} onChange={(e) => setForm({ ...form, tipoOrigen: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin origen —</option>
                  {TIPOS_ORIGEN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{LABEL_ORIGEN[form.tipoOrigen] || 'Identificación del origen'}</label>
                <input value={form.identificacionOrigen} onChange={(e) => setForm({ ...form, identificacionOrigen: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Lugar de muestreo</label>
                <select value={form.lugarMuestreo} onChange={(e) => setForm({ ...form, lugarMuestreo: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin lugar —</option>
                  {lugares.map((l) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cliente / Proveedor</label>
                <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  list="contactos-muestra" className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
                <datalist id="contactos-muestra">
                  {contactos.map((c) => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Solicitado por</label>
                <input value={form.solicitadoPor} onChange={(e) => setForm({ ...form, solicitadoPor: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Remito</label>
                <input value={form.remito} onChange={(e) => setForm({ ...form, remito: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Envase</label>
                <input value={form.envase} onChange={(e) => setForm({ ...form, envase: e.target.value })}
                  placeholder={'"bidón 5 L"'} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Laboratorio</label>
                <select value={form.laboratorio} onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base">
                  <option value="">— Sin laboratorio —</option>
                  {laboratorios.map((l) => (
                    <option key={l.id} value={l.nombre}>{l.nombre}{l.esExterno ? '' : ' (interno)'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 border-t pt-3">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">Ensayos solicitados</h4>
              {ensayosSel.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ensayosSel.map((e, idx) => {
                    const p = e.parametroId ? parametros.find((x) => x.id === e.parametroId) : null
                    const texto = p ? (p.abreviatura || (p.metodo ? `${p.nombre} · ${p.metodo}` : p.nombre)) : e.libre
                    return (
                      <span key={idx} className="text-xs px-2 py-1 rounded-full bg-brand-green-light text-brand-green-dark border border-brand-green flex items-center gap-1">
                        {texto}
                        <button type="button" onClick={() => setEnsayosSel((s) => s.filter((_, i) => i !== idx))} className="hover:opacity-60">×</button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-1.5 items-center">
                <select value={ensayoParamId} onChange={(e) => setEnsayoParamId(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm flex-1">
                  <option value="">Elegir del catálogo...</option>
                  {parametros
                    .filter((p) => !ensayosSel.some((e) => e.parametroId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}{p.metodo ? ` · ${p.metodo}` : ''}</option>
                    ))}
                </select>
                <button type="button"
                  onClick={() => { if (ensayoParamId) { setEnsayosSel((s) => [...s, { parametroId: Number(ensayoParamId) }]); setEnsayoParamId('') } }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Agregar</button>
                <input value={ensayoLibre} onChange={(e) => setEnsayoLibre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ensayoLibre.trim() && (setEnsayosSel((s) => [...s, { libre: ensayoLibre.trim() }]), setEnsayoLibre('')))}
                  placeholder="Ensayo fuera del catálogo" className="border rounded-lg px-3 py-1.5 text-sm flex-1" />
                <button type="button"
                  onClick={() => { if (ensayoLibre.trim()) { setEnsayosSel((s) => [...s, { libre: ensayoLibre.trim() }]); setEnsayoLibre('') } }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Agregar libre</button>
              </div>
            </div>

            <div className="mt-3 border-t pt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de envío</label>
                <input type="date" value={form.fechaEnvio} onChange={(e) => setForm({ ...form, fechaEnvio: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              {labSeleccionado?.delExterior && (
                <div>
                  <label className="text-sm font-medium text-gray-700">AWB</label>
                  <input value={form.awb} onChange={(e) => setForm({ ...form, awb: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Protocolo</label>
                <input value={form.protocolo} onChange={(e) => setForm({ ...form, protocolo: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de resultado</label>
                <input type="date" value={form.fechaResultado} onChange={(e) => setForm({ ...form, fechaResultado: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Resultado</label>
                <textarea value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Observación</label>
                <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form.anulada} onChange={(e) => setForm({ ...form, anulada: e.target.checked })} />
                Muestra anulada
              </label>
            </div>

            {printMsg && <p className="text-brand-red text-sm mt-2">{printMsg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setGuardada(null) }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
              {guardada && (
                <button type="button" onClick={() => imprimirRotulo({ ...guardada, ...form, fecha: form.fecha })}
                  className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light">
                  Imprimir rótulo
                </button>
              )}
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50">
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar Muestra'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">N°</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Origen</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Laboratorio</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Ensayos</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Estado</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((m) => (
              <tr key={m.id} className={`border-b last:border-0 hover:bg-gray-50 ${m.estado === 'ANULADA' ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 font-mono font-semibold">{m.numero}</td>
                <td className="px-3 py-2">{formatDateOnly(m.fecha)}</td>
                <td className="px-3 py-2">{m.producto}</td>
                <td className="px-3 py-2 text-sm">
                  {m.tipoOrigen ? `${m.tipoOrigen}${m.identificacionOrigen ? ` · ${m.identificacionOrigen}` : ''}` : '—'}
                </td>
                <td className="px-3 py-2 text-sm">{m.laboratorio || '—'}</td>
                <td className="px-3 py-2 text-xs max-w-40 truncate" title={m.ensayos.map(etiquetaEnsayo).join(', ')}>
                  {m.ensayos.map(etiquetaEnsayo).join(', ') || '—'}
                </td>
                <td className="px-3 py-2">{badgeEstado(m)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => openEdit(m)} className="text-brand-green-dark hover:text-brand-green font-medium">Editar</button>
                    <button onClick={() => imprimirRotulo(m)} className="text-gray-500 hover:text-gray-700 font-medium">Imprimir rótulo</button>
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700 font-medium pl-2 border-l border-gray-200">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-base">
                  Sin muestras registradas
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

      {printMsg && !showForm && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white bg-brand-dark animate-fade-in">
          🖨️ {printMsg}
        </div>
      )}
    </div>
  )
}
