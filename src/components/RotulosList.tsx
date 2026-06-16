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

export default function RotulosList({ rotulos }: { rotulos: Rotulo[] }) {
  const router = useRouter()
  const [config, setConfig] = useState({
    etiquetaAncho: '100',
    etiquetaAlto: '45',
    etiquetaFuente: '9',
    empresa: 'Laboratorio SFA',
    logo: '',
  })

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {})
  }, [])

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

  const tipoLabel: Record<string, string> = {
    INGRESOS: 'MUESTRA DE INGRESO',
    SALIDAS: 'MUESTRA DE SALIDA',
    SFA_INGRESO: 'SFA – INGRESO',
    SFA_SALIDA: 'SFA – SALIDA',
    MUESTRA_ESP: 'MUESTRA ESPECIAL',
    DHSH: 'DHSH – MOVIMIENTO INTERNO',
    OLEOCHEM: 'OLEOCHEM',
    CONJUNTO_EXP: 'CONJUNTO EXPORTACIÓN',
    SFF: 'SFF',
    ME_INGLES: 'SAMPLE LABEL',
  }

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
    .label { border: 1px solid #000; padding: 3px; width: calc(${w}mm - 5mm); min-height: calc(${h}mm - 5mm); }
    .header { display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px; gap: 6px; }
    .logo { max-height: ${fs * 2.5}pt; max-width: 40%; object-fit: contain; }
    .header-text { text-align: center; }
    .company { font-size: ${fs + 3}pt; font-weight: bold; }
    .tipo { font-size: ${fs}pt; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 3px; vertical-align: top; line-height: 1.4; }
    td:first-child { font-weight: bold; width: 38%; color: #444; }
    tr { border-bottom: 1px solid #eee; }
    tr:last-child { border-bottom: none; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: ${w}mm ${h}mm; margin: 2mm; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      ${logo ? `<img src="${logo}" class="logo" alt="logo" />` : ''}
      <div class="header-text">
        ${!logo ? `<div class="company">${empresa}</div>` : ''}
        <div class="tipo">${tipoLabel[tipo] || tipo}</div>
      </div>
    </div>
    <table>
      ${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td>${k}:</td><td>${v}</td></tr>`).join('\n      ')}
    </table>
  </div>
</body>
</html>`
}
