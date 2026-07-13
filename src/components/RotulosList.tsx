'use client'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const TIPO_LABELS: Record<string, string> = {
  INGRESOS: 'Ingreso',
  SALIDAS: 'Salida',
  MUESTRA_ESP: 'Muestra Especial',
  ME_INGLES: 'Muestra (Inglés)',
  SFA_SALIDA: 'SFA Salida',
  SFA_INGRESO: 'SFA Ingreso',
  DHSH: 'DHSH',
  OLEOCHEM: 'Oleochem',
  CONJUNTO_EXP: 'Conjunto Exportación',
  SFF: 'SFF',
}

type Rotulo = {
  id: number
  tipo: string
  data: unknown
  createdAt: Date | string
  ingreso: { hrRemito: string; origen: string } | null
  despacho: { hrContrato: string; destino: string } | null
}

// API que expone la app de escritorio (Electron) para imprimir sin diálogo.
type DesktopPrinter = {
  getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>
  printLabel: (opts: { html: string; deviceName?: string; widthMm: number; heightMm: number }) => Promise<{ success: boolean; failureReason: string }>
}

declare global {
  interface Window {
    desktopPrinter?: DesktopPrinter
  }
}

const PRINTER_STORAGE_KEY = 'rotulos_impresora'

export default function RotulosList({ rotulos }: { rotulos: Rotulo[] }) {
  const router = useRouter()
  const [config, setConfig] = useState({
    etiquetaAncho: '100',
    etiquetaAlto: '45',
    etiquetaFuente: '9',
    empresa: 'Laboratorio SFA',
    logo: '',
  })
  const [previewRotulo, setPreviewRotulo] = useState<Rotulo | null>(null)
  const [printers, setPrinters] = useState<{ name: string; isDefault: boolean }[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [quickPrintAvailable, setQuickPrintAvailable] = useState(false)
  const [quickMsg, setQuickMsg] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {})

    // Dentro de la app de escritorio se habilita la impresión rápida (sin diálogo).
    if (window.desktopPrinter) {
      setQuickPrintAvailable(true)
      setSelectedPrinter(localStorage.getItem(PRINTER_STORAGE_KEY) || '')
      window.desktopPrinter.getPrinters().then(setPrinters).catch(() => {})
    }
  }, [])

  function choosePrinter(name: string) {
    setSelectedPrinter(name)
    localStorage.setItem(PRINTER_STORAGE_KEY, name)
  }

  function showQuickMsg(text: string, error = false) {
    setQuickMsg({ text, error })
    setTimeout(() => setQuickMsg(null), 4000)
  }

  async function handleQuickPrint(rotulo: Rotulo) {
    if (!window.desktopPrinter) return
    const data = rotulo.data as Record<string, string>
    const html = buildLabelHTML(rotulo.tipo, data, config)
    try {
      const res = await window.desktopPrinter.printLabel({
        html,
        deviceName: selectedPrinter || undefined,
        widthMm: Number(config.etiquetaAncho) || 100,
        heightMm: Number(config.etiquetaAlto) || 45,
      })
      if (res.success) {
        showQuickMsg(`Rótulo #${rotulo.id} enviado a ${selectedPrinter || 'la impresora predeterminada'}`)
      } else {
        showQuickMsg(`No se pudo imprimir: ${res.failureReason || 'error desconocido'}`, true)
      }
    } catch {
      showQuickMsg('No se pudo imprimir el rótulo', true)
    }
  }

  function handlePrint(rotulo: Rotulo) {
    const data = rotulo.data as Record<string, string>
    const w = window.open('', '_blank')
    if (!w) return
    const content = buildLabelHTML(rotulo.tipo, data, config)
    w.document.write(content)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div>
      {quickPrintAvailable && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">⚡ Impresión rápida en:</span>
          <select
            value={selectedPrinter}
            onChange={(e) => choosePrinter(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="">Impresora predeterminada</option>
            {printers.map((p) => (
              <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (predeterminada)' : ''}</option>
            ))}
          </select>
        </div>
      )}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Referencia</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rotulos.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400">#{r.id}</td>
                <td className="px-3 py-2">
                  <span className="bg-brand-green-light text-brand-green-dark text-xs px-2 py-1 rounded-full">
                    {TIPO_LABELS[r.tipo] || r.tipo}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs font-mono">
                  {r.ingreso
                    ? `${r.ingreso.hrRemito} — ${r.ingreso.origen}`
                    : r.despacho
                    ? `${r.despacho.hrContrato} — ${r.despacho.destino}`
                    : '—'}
                </td>
                <td className="px-3 py-2">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setPreviewRotulo(r)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-2"
                    title="Ver observaciones"
                  >
                    Ver
                  </button>
                  {quickPrintAvailable && (
                    <button
                      onClick={() => handleQuickPrint(r)}
                      className="bg-brand-green text-white hover:bg-brand-green-dark text-sm font-medium px-2.5 py-1 rounded-lg mr-2"
                      title="Imprimir directo en la Zebra, sin diálogo"
                    >
                      ⚡ Rápida
                    </button>
                  )}
                  <button
                    onClick={() => handlePrint(r)}
                    className="text-brand-green-dark hover:text-brand-green text-sm font-medium"
                  >
                    Imprimir rótulo
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('¿Eliminar este rótulo?')) return
                      await fetch(`/api/rotulos/${r.id}`, { method: 'DELETE' })
                      router.refresh()
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {rotulos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  Sin rótulos generados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {quickMsg && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white animate-fade-in ${quickMsg.error ? 'bg-brand-red' : 'bg-brand-dark'}`}>
          {quickMsg.error ? '⚠️ ' : '🖨️ '}{quickMsg.text}
        </div>
      )}

      {previewRotulo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPreviewRotulo(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-800">
                {TIPO_LABELS[previewRotulo.tipo] || previewRotulo.tipo}
                {' '}— Observaciones
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {(previewRotulo.data as Record<string, string>)?.observacion || 'Sin observaciones.'}
              </p>
            </div>
            <div className="p-5 border-t flex justify-end">
              <button onClick={() => setPreviewRotulo(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildLabelHTML(tipo: string, data: Record<string, string>, config: { etiquetaAncho: string; etiquetaAlto: string; etiquetaFuente: string; empresa: string; logo: string }): string {
  const w = config.etiquetaAncho || '100'
  const h = config.etiquetaAlto || '45'
  const fs = Number(config.etiquetaFuente || '9')
  const empresa = config.empresa || 'Laboratorio SFA'
  const logo = config.logo

  const esSalida = tipo === 'SALIDAS' || tipo === 'SFA_SALIDA'

  const rows = esSalida
    ? [
        ['Destino', data.destino || ''],
        ['Contrato', data.hrContrato || ''],
        ['Transporte', data.idTransporte || ''],
        ['Fecha', data.fecha || ''],
        ['Operador', data.operador || ''],
      ]
    : [
        ['Proveedor', data.origen || data.proveedor || ''],
        ['Producto', data.producto1 || data.producto || ''],
        ...(data.producto2 ? [['Producto 2', data.producto2]] : []),
        ['HR / Remito', data.hrRemito || ''],
        ['Fecha', data.fecha || ''],
        ['Precinto', data.precinto || ''],
        ['Operador', data.operador || ''],
      ]

  const observaciones = data.observacion || data.observaciones || ''

  return `<!DOCTYPE html>
<html style="color-scheme: light;">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  <title>Rótulo</title>
  <style>
    @page { size: ${w}mm ${h}mm; margin: 2mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: ${fs}pt; margin: 0; padding: 0; background: #fff !important; color: #000 !important; color-scheme: light; }
    .label { border: 1px solid #000; padding: 3px; width: calc(${w}mm - 5mm); min-height: calc(${h}mm - 5mm); display: flex; flex-direction: column; }
    .header { display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px; gap: 2px; text-align: center; }
    .logo { max-height: ${fs * 4}pt; max-width: 80%; object-fit: contain; }
    .company { font-size: ${fs + 3}pt; font-weight: bold; }
    .body { display: flex; flex: 1; gap: 4px; }
    table { width: 100%; border-collapse: collapse; flex: 1; }
    td { padding: 1px 3px; vertical-align: top; line-height: 1.4; }
    td:first-child { font-weight: bold; width: 38%; color: #444; }
    tr { border-bottom: 1px solid #eee; }
    tr:last-child { border-bottom: none; }
    .obs { width: 40%; border-left: 1px solid #000; padding-left: 5px; display: flex; flex-direction: column; }
    .obs-title { font-weight: bold; color: #444; font-size: ${fs}pt; margin-bottom: 3px; }
    .obs-text { font-size: ${fs}pt; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: ${w}mm ${h}mm; margin: 2mm; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      ${logo ? `<img src="${logo}" class="logo" alt="logo" />` : `<div class="company">${empresa}</div>`}
    </div>
    <div class="body">
      <table>
        ${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td>${k}:</td><td>${v}</td></tr>`).join('\n        ')}
      </table>
      <div class="obs">
        <div class="obs-title">Observaciones</div>
        <div class="obs-text">${observaciones}</div>
      </div>
    </div>
  </div>
</body>
</html>`
}
