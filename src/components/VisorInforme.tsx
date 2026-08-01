'use client'
import { useEffect, useState } from 'react'
import { buildInformeHTML, buildInformeSVG, type InformeTanque } from '@/lib/informe'

// Visor de informes: lo usan el análisis de tanque y el de materia prima. Antes
// cada pantalla tenía su copia del render y de los cuatro botones, que es
// justamente como se desincronizan las cosas en este repo.

export default function VisorInforme({
  informe,
  nombreArchivo,
  onCerrar,
  onAviso,
}: {
  informe: InformeTanque
  nombreArchivo: string // sin extensión
  onCerrar: () => void
  onAviso: (texto: string, error?: boolean) => void
}) {
  // Compartir con archivos existe en Windows y Android, no en todos lados; el
  // botón solo aparece donde funciona. Se resuelve en el cliente.
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [puedeCopiar, setPuedeCopiar] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPuedeCopiar(typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write)
    try {
      const prueba = new File([''], 'informe.png', { type: 'image/png' })
      setPuedeCompartir(!!navigator.canShare?.({ files: [prueba] }))
    } catch {
      setPuedeCompartir(false)
    }
  }, [])

  // El informe se arma como SVG (solo texto y formas, sin foreignObject) y se
  // dibuja en un canvas para exportarlo como PNG. Todo nativo: sin SVG externo
  // el canvas no queda bloqueado y toBlob() funciona.
  function aPng(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const { svg, ancho, alto } = buildInformeSVG(informe)
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
      const img = new Image()
      img.onload = () => {
        const escala = 2 // al doble para que se lea al ampliar
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

  async function descargarImagen() {
    const blob = await aPng()
    if (!blob) return onAviso('No se pudo generar la imagen', true)
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = `${nombreArchivo}.png`
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
  }

  // Deja el informe en el portapapeles: se pega en WhatsApp o en el mail con
  // Ctrl+V, sin descargar y volver a subir.
  async function copiarImagen() {
    const blob = await aPng()
    if (!blob) return onAviso('No se pudo generar la imagen', true)
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      onAviso('Informe copiado: pegalo en WhatsApp o en el mail con Ctrl+V')
    } catch {
      onAviso('El navegador no dejó copiar la imagen. Probá con "Descargar imagen".', true)
    }
  }

  async function compartirImagen() {
    const blob = await aPng()
    if (!blob) return onAviso('No se pudo generar la imagen', true)
    try {
      await navigator.share({ files: [new File([blob], `${nombreArchivo}.png`, { type: 'image/png' })], title: informe.titulo })
    } catch (e) {
      // Cancelar el menú de compartir no es un error que valga la pena avisar.
      if ((e as Error)?.name !== 'AbortError') onAviso('No se pudo compartir el informe', true)
    }
  }

  function descargarPDF() {
    const w = window.open('', '_blank')
    if (!w) return onAviso('El navegador bloqueó la ventana de impresión', true)
    w.document.write(buildInformeHTML(informe))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const desvios = informe.desvios ?? []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-3 border-b-4 border-brand-green pb-3 mb-4">
            {informe.logo && <img src={informe.logo} alt={informe.empresa} className="h-12 max-w-32 object-contain" />}
            <div>
              {!informe.logo && <div className="text-lg font-bold text-brand-dark">{informe.empresa}</div>}
              <div className={informe.logo ? 'text-base font-bold text-brand-dark' : 'text-sm text-gray-500'}>
                {informe.titulo}
              </div>
            </div>
          </div>

          {/* El desvío va arriba de todo: el informe se manda como foto y tiene
              que leerse sin buscarlo en la tabla. */}
          {desvios.length > 0 && (
            <div className="bg-brand-red text-white rounded-lg px-4 py-3 mb-4">
              <div className="font-bold text-sm">⚠ Fuera de especificación</div>
              <ul className="mt-1 text-sm list-disc list-inside space-y-0.5">
                {desvios.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
            {informe.identificacion.map(([k, v]) => (
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
              {informe.resultados.map((r, i) => (
                <tr key={i} className={`border-b border-gray-100 ${r.fueraDeSpec ? 'text-brand-red' : ''}`}>
                  <td className="px-2 py-1.5">{r.etiqueta}{r.fueraDeSpec && ' ⚠'}</td>
                  <td className="px-2 py-1.5 font-semibold whitespace-nowrap">
                    {r.valor}{r.unidad && <span className="font-normal text-gray-500 text-xs"> {r.unidad}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-500">{r.spec || '—'}</td>
                </tr>
              ))}
              {informe.resultados.length === 0 && (
                <tr><td colSpan={3} className="px-2 py-3 text-gray-400">Sin resultados cargados</td></tr>
              )}
            </tbody>
          </table>

          {informe.comentario && (
            <div className="mt-4 text-sm">
              <span className="text-gray-500 block mb-1">Comentario</span>
              <p className="bg-gray-50 border-l-4 border-gray-300 px-3 py-2 whitespace-pre-wrap">{informe.comentario}</p>
            </div>
          )}
          <p className="mt-4 pt-2 border-t text-xs text-gray-400">{informe.pie}</p>
        </div>

        <div className="p-4 border-t flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg mr-auto">
            Cerrar
          </button>
          {puedeCopiar && (
            <button onClick={copiarImagen} className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark">
              Copiar imagen
            </button>
          )}
          {puedeCompartir && (
            <button onClick={compartirImagen} className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark">
              Compartir
            </button>
          )}
          <button onClick={descargarImagen} className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light">
            Descargar imagen
          </button>
          <button onClick={descargarPDF} className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light">
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
