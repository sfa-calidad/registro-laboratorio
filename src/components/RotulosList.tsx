'use client'
import { formatDate } from '@/lib/utils'

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
  function handlePrint(rotulo: Rotulo) {
    const data = (rotulo.data ?? {}) as Record<string, string>
    const w = window.open('', '_blank')
    if (!w) return
    const content = buildLabelHTML(rotulo.tipo, data)
    w.document.write(content)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Referencia</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rotulos.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">#{r.id}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {TIPO_LABELS[r.tipo] || r.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {r.ingreso
                    ? `${r.ingreso.hrRemito} — ${r.ingreso.origen}`
                    : r.despacho
                    ? `${r.despacho.hrContrato} — ${r.despacho.destino}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handlePrint(r)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Imprimir rótulo
                  </button>
                </td>
              </tr>
            ))}
            {rotulos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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

function buildLabelHTML(tipo: string, data: Record<string, string>): string {
  const esIngreso = tipo === 'INGRESOS' || tipo === 'SFA_INGRESO'

  const rows = esIngreso
    ? [
        ['Proveedor', data.origen || data.proveedor || ''],
        ['Producto', data.producto1 || data.producto || ''],
        ['Producto 2', data.producto2 || ''],
        ['HR / Remito', data.hrRemito || ''],
        ['Fecha', data.fecha || ''],
        ['Precinto', data.precinto || ''],
        ['Observación', data.observacion || ''],
      ]
    : [
        ['Proveedor', 'SFA'],
        ['Producto', data.producto || ''],
        ['Cliente', data.destino || ''],
        ['Transporte', data.idTransporte || ''],
        ['HR / Contrato', data.hrContrato || ''],
        ['Depósito', data.deposito || ''],
        ['Precinto SFA', data.precintSFA || ''],
        ['Precinto Aduana', data.precintAduana || ''],
        ['Fecha', data.fecha || ''],
        ['Observación', data.observacion || ''],
      ]

  const tipoLabel: Record<string, string> = {
    INGRESOS: 'MUESTRA DE INGRESO',
    SALIDAS: 'MUESTRA DE SALIDA',
    SFA_INGRESO: 'SFA – MUESTRA DE INGRESO',
    SFA_SALIDA: 'SFA – MUESTRA DE SALIDA',
    MUESTRA_ESP: 'MUESTRA ESPECIAL',
    DHSH: 'DHSH – MOVIMIENTO INTERNO',
    OLEOCHEM: 'OLEOCHEM',
    CONJUNTO_EXP: 'CONJUNTO EXPORTACIÓN',
    SFF: 'SFF',
    ME_INGLES: 'SAMPLE LABEL',
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rótulo</title>
  <style>
    @page { size: A5; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
    .label { border: 2px solid #000; padding: 8px; width: 100%; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
    .company { font-size: 14px; font-weight: bold; }
    .tipo { font-size: 12px; font-weight: bold; color: #333; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 3px 4px; vertical-align: top; }
    td:first-child { font-weight: bold; width: 38%; color: #555; }
    tr { border-bottom: 1px solid #eee; }
    tr:last-child { border-bottom: none; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="company">LABORATORIO SFA</div>
      <div class="tipo">${tipoLabel[tipo] || tipo}</div>
    </div>
    <table>
      ${rows
        .filter(([, v]) => v)
        .map(([k, v]) => `<tr><td>${k}:</td><td>${v}</td></tr>`)
        .join('\n      ')}
    </table>
  </div>
</body>
</html>`
}
