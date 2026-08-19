'use client'
import { useState, useEffect } from 'react'
import { formatDateOnly, todayISO } from '@/lib/utils'
import { buildLabelHTML, type EtiquetaConfig } from '@/lib/etiqueta'
import { imprimirEtiqueta, type ModoImpresion } from '@/lib/impresion'
import { alturaDeRotulo, esPuntoFijo, PUNTOS_FIJOS } from '@/lib/zpl'

// Rotulador para el calado: se completa en el momento de salir a calar y se
// imprime. No se guarda nada en la base — es solo la etiqueta del envase.

// Se recuerda por PC cuál de los dos caminos de impresión prefiere el usuario.
const MODO_STORAGE_KEY = 'rotulos_modo_impresion'

const REFERENCIAS = [
  { value: 'AF', label: 'AF — antes del fondo' },
  { value: 'DS', label: 'DS — desde la superficie' },
  { value: 'AC', label: 'AC — antes del cono' },
]

type Producto = { id: number; nombre: string }
type Analista = { id: number; nombre: string; apellido: string }

const emptyForm = {
  tanque: '',
  producto: '',
  alturaM: '',
  referencia: '',
  conjuntoHaciaArriba: false,
  fecha: '',
  analista1: '',
  analista2: '',
  observacion: '',
}

export default function RotuladorCalado({
  config,
  deviceName,
  onMensaje,
}: {
  config: EtiquetaConfig
  deviceName?: string
  onMensaje: (texto: string, error?: boolean) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [productos, setProductos] = useState<Producto[]>([])
  const [analistas, setAnalistas] = useState<Analista[]>([])
  const [imprimiendo, setImprimiendo] = useState(false)
  // Cómo se manda a la Zebra desde la app de escritorio. Se recuerda por PC,
  // igual que la impresora elegida.
  const [modo, setModo] = useState<ModoImpresion>('diseno')
  const [enEscritorio, setEnEscritorio] = useState(false)

  // Los catálogos se piden recién al abrir el rotulador: la pantalla de
  // Rótulos no los necesita para nada más.
  useEffect(() => {
    if (!abierto || productos.length || analistas.length) return
    fetch('/api/productos').then((r) => r.json()).then(setProductos).catch(() => {})
    fetch('/api/analistas').then((r) => r.json()).then(setAnalistas).catch(() => {})
  }, [abierto, productos.length, analistas.length])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnEscritorio(!!window.desktopPrinter)
    const guardado = localStorage.getItem(MODO_STORAGE_KEY)
    if (guardado === 'zpl' || guardado === 'diseno') setModo(guardado)
  }, [])

  function elegirModo(m: ModoImpresion) {
    setModo(m)
    localStorage.setItem(MODO_STORAGE_KEY, m)
  }

  function abrir() {
    setForm({ ...emptyForm, fecha: todayISO() })
    setAbierto(true)
  }

  const datos = {
    tanque: form.tanque.trim(),
    producto: form.producto,
    altura: alturaDeRotulo(form.alturaM, form.referencia, form.conjuntoHaciaArriba),
    fecha: form.fecha ? formatDateOnly(form.fecha) : '',
    analista1: form.analista1,
    analista2: form.analista2,
    observacion: form.observacion.trim(),
  }

  const listo = Boolean(datos.tanque && datos.producto)

  async function imprimir() {
    if (!listo || imprimiendo) return
    setImprimiendo(true)
    const res = await imprimirEtiqueta('CALADO', datos, config, { deviceName, modo })
    setImprimiendo(false)
    if (!res.ok) {
      onMensaje(`No se pudo imprimir: ${res.mensaje}`, true)
      return
    }
    // La ventana queda abierta con los datos cargados: al rotular varias
    // muestras del mismo tanque solo cambia la altura, y cerrarla obligaba a
    // reescribir todo.
    if (res.usoDialogo) {
      // En el navegador se abre el diálogo: el aviso sobra.
      return
    }
    onMensaje(`Rótulo del tanque ${datos.tanque} enviado a la impresora`)
  }

  const nombresAnalistas = analistas.map((a) => `${a.nombre} ${a.apellido}`)

  // Tamaño de la vista previa: los milímetros de la etiqueta pasados a píxeles
  // de pantalla (96 dpi) y escalados para que entren en el panel.
  const anchoMm = Number(config.etiquetaAncho) || 100
  const altoMm = Number(config.etiquetaAlto) || 45
  const anchoPx = Math.round((anchoMm * 96) / 25.4)
  const altoPx = Math.round((altoMm * 96) / 25.4)
  const ANCHO_PANEL = 384
  const escala = Math.min(1, ANCHO_PANEL / anchoPx)

  return (
    <>
      <button
        onClick={abrir}
        className="bg-brand-green text-white hover:bg-brand-green-dark text-sm font-medium px-3 py-1.5 rounded-lg"
      >
        Rotulador
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">Rotulador</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Se imprime nada más: no queda registrado en el listado de rótulos ni en los análisis.
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Tanque *</label>
                  <input
                    autoFocus
                    value={form.tanque}
                    onChange={(e) => setForm({ ...form, tanque: e.target.value })}
                    placeholder={'"26", "26 + 27"'}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Producto *</label>
                  <select
                    value={form.producto}
                    onChange={(e) => setForm({ ...form, producto: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  >
                    <option value="">Seleccionar...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Altura (m)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={esPuntoFijo(form.referencia) ? '' : form.alturaM}
                    onChange={(e) => setForm({ ...form, alturaM: e.target.value })}
                    disabled={esPuntoFijo(form.referencia)}
                    placeholder={esPuntoFijo(form.referencia) ? form.referencia : '0,5'}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Medida desde</label>
                  <select
                    value={form.referencia}
                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  >
                    <option value="">No aplica</option>
                    <optgroup label="Medida desde una referencia">
                      {REFERENCIAS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Punto fijo (va como altura)">
                      {PUNTOS_FIJOS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.conjuntoHaciaArriba}
                      onChange={(e) => setForm({ ...form, conjuntoHaciaArriba: e.target.checked })}
                    />
                    Conjunto hacia arriba (HA)
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Analista 1</label>
                  <select
                    value={form.analista1}
                    onChange={(e) => setForm({ ...form, analista1: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  >
                    <option value="">—</option>
                    {nombresAnalistas.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Analista 2</label>
                  <select
                    value={form.analista2}
                    onChange={(e) => setForm({ ...form, analista2: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  >
                    <option value="">—</option>
                    {nombresAnalistas.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Observación</label>
                  <textarea
                    rows={3}
                    value={form.observacion}
                    onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-base"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Vista previa</div>
                <div className="border rounded-lg bg-gray-50 p-2">
                  {/* La etiqueta se arma en milímetros reales y se escala para
                      que entre en el panel: así se ve completa, sin recortes,
                      con cualquier tamaño configurado. */}
                  <div style={{ width: anchoPx * escala, height: altoPx * escala }}>
                    <iframe
                      title="Vista previa del rótulo"
                      srcDoc={buildLabelHTML('CALADO', datos, config)}
                      scrolling="no"
                      className="bg-white border-0"
                      style={{
                        width: anchoPx,
                        height: altoPx,
                        transform: `scale(${escala})`,
                        transformOrigin: 'top left',
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Se imprime en el tamaño configurado ({anchoMm} × {altoMm} mm).
                </p>
              </div>
            </div>

            <div className="p-5 border-t flex flex-wrap items-center justify-end gap-3">
              {/* Solo tiene sentido en la app de escritorio: en el navegador
                  siempre se abre el diálogo, que ya imprime el diseño. */}
              {enEscritorio && (
                <div className="mr-auto">
                  <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => elegirModo('diseno')}
                      className={`px-3 py-1.5 ${modo === 'diseno' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      Con logo
                    </button>
                    <button
                      type="button"
                      onClick={() => elegirModo('zpl')}
                      className={`px-3 py-1.5 border-l border-gray-300 ${modo === 'zpl' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      Solo texto
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {modo === 'diseno'
                      ? 'Abre el diálogo de impresión y sale igual que la vista previa, con el logo.'
                      : 'Impresión rápida: va directo a la Zebra, sin diálogo. Más nítida, pero sin logo.'}
                  </p>
                </div>
              )}
              <button onClick={() => setAbierto(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cerrar
              </button>
              <button
                onClick={imprimir}
                disabled={!listo || imprimiendo}
                className="bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium rounded-lg"
                title={listo ? '' : 'Completá al menos el tanque y el producto'}
              >
                {imprimiendo ? 'Imprimiendo...' : 'Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
