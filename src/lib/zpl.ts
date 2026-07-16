// Generación de ZPL (lenguaje nativo de las impresoras Zebra) para los
// rótulos. Enviar ZPL crudo evita el sistema de impresión de Chromium/Windows
// y es la vía más rápida y confiable con estas impresoras (203 dpi = 8 dots/mm).

export type LabelData = Record<string, string>

export function labelRows(tipo: string, data: LabelData): [string, string][] {
  const esSalida = tipo === 'SALIDAS' || tipo === 'SFA_SALIDA'
  const rows: [string, string][] = esSalida
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
        ...(data.producto2 ? ([['Producto 2', data.producto2]] as [string, string][]) : []),
        ['HR / Remito', data.hrRemito || ''],
        ['Fecha', data.fecha || ''],
        ['Precinto', data.precinto || ''],
        ['Operador', data.operador || ''],
      ]
  return rows.filter(([, v]) => v)
}

// El ^ y el ~ son caracteres de control de ZPL: no pueden ir en los datos.
function zplSafe(text: string): string {
  return (text || '').replace(/[\^~\\]/g, ' ').trim()
}

export function buildLabelZPL(
  tipo: string,
  data: LabelData,
  config: { etiquetaAncho: string; etiquetaAlto: string; empresa: string }
): string {
  const DOTS_PER_MM = 8 // 203 dpi
  const W = Math.round((Number(config.etiquetaAncho) || 100) * DOTS_PER_MM)
  const H = Math.round((Number(config.etiquetaAlto) || 45) * DOTS_PER_MM)
  const empresa = zplSafe(config.empresa || 'Laboratorio SFA')
  const rows = labelRows(tipo, data)
  const obs = zplSafe(data.observacion || data.observaciones || '')

  const margin = 8
  const headerBottom = 62
  const divX = Math.round(W * 0.62) // columna derecha para observaciones
  const rowsTop = headerBottom + 14
  const availH = H - rowsTop - margin - 4
  const step = Math.max(24, Math.min(36, Math.floor(availH / Math.max(rows.length, 1))))
  const font = step >= 30 ? 24 : 20

  const zpl: string[] = []
  zpl.push('^XA')
  zpl.push('^CI28') // UTF-8 (acentos y ñ)
  zpl.push(`^PW${W}`)
  zpl.push(`^LL${H}`)
  zpl.push('^LH0,0')
  // Borde exterior
  zpl.push(`^FO${margin},${margin}^GB${W - margin * 2},${H - margin * 2},2^FS`)
  // Encabezado: nombre de la empresa centrado + línea
  zpl.push(`^FO${margin + 8},${margin + 12}^A0N,32,32^FB${W - margin * 2 - 16},1,0,C,0^FD${empresa}^FS`)
  zpl.push(`^FO${margin + 8},${headerBottom}^GB${W - margin * 2 - 16},2,2^FS`)
  // Divisor vertical de la columna de observaciones
  zpl.push(`^FO${divX},${headerBottom + 8}^GB2,${H - headerBottom - margin - 12},2^FS`)
  // Filas de datos (etiqueta: valor)
  const labelX = margin + 12
  const valueX = Math.round(divX * 0.42)
  rows.forEach(([k, v], i) => {
    const y = rowsTop + i * step
    zpl.push(`^FO${labelX},${y}^A0N,${font},${font}^FD${zplSafe(k)}:^FS`)
    zpl.push(`^FO${valueX},${y}^A0N,${font},${font}^FB${divX - valueX - 8},1,0,L,0^FD${zplSafe(v)}^FS`)
  })
  // Observaciones (columna derecha, con ajuste de línea)
  const obsX = divX + 12
  const obsW = W - obsX - margin - 6
  const obsLines = Math.max(1, Math.floor((H - rowsTop - 32 - margin) / (font + 4)))
  zpl.push(`^FO${obsX},${rowsTop}^A0N,${font},${font}^FDObservaciones^FS`)
  if (obs) {
    zpl.push(`^FO${obsX},${rowsTop + font + 10}^A0N,${font - 2},${font - 2}^FB${obsW},${obsLines},2,L,0^FD${obs}^FS`)
  }
  zpl.push('^PQ1') // una copia
  zpl.push('^XZ')
  return zpl.join('\n')
}
