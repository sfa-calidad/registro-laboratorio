// Generación de ZPL (lenguaje nativo de las impresoras Zebra) para los
// rótulos. Enviar ZPL crudo evita el sistema de impresión de Chromium/Windows
// y es la vía más rápida y confiable con estas impresoras (203 dpi = 8 dots/mm).

export type LabelData = Record<string, string>

export function labelRows(tipo: string, data: LabelData): [string, string][] {
  // Rótulo de muestra a laboratorio: identifica el envase físico.
  if (tipo === 'MUESTRAS') {
    return ([
      ['N° muestra', data.numero || ''],
      ['Producto', data.producto || ''],
      ['Fecha', data.fecha || ''],
    ] as [string, string][]).filter(([, v]) => v)
  }
  // Rótulo de calado: se escribe a mano en el momento de calar y se pega en el
  // envase. No se guarda en la base, solo se imprime.
  if (tipo === 'CALADO') {
    const analistas = [data.analista1, data.analista2].filter((a) => a && a.trim())
    return ([
      ['Tanque', data.tanque || ''],
      ['Producto', data.producto || ''],
      ['Altura', data.altura || ''],
      ['Fecha', data.fecha || ''],
      // Con un solo analista no tiene sentido numerarlo.
      ...analistas.map((a, i): [string, string] => [analistas.length > 1 ? `Analista ${i + 1}` : 'Analista', a]),
    ] as [string, string][]).filter(([, v]) => v)
  }
  const esSalida = tipo === 'SALIDAS' || tipo === 'SFA_SALIDA'
  const rows: [string, string][] = esSalida
    ? [
        ['Destino', data.destino || ''],
        ['Producto', data.producto || ''],
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

// Ancho medio de un carácter de la fuente escalable A0 (CG Triumvirate), como
// fracción del alto. Es una estimación: alcanza para decidir si un valor entra
// en su columna, no para medirlo al dot.
const ANCHO_CARACTER = 0.6

// Un ^FB de una sola línea corta lo que no entra. En vez de perder el final de
// un destino o una razón social larga, se achica la letra de esa fila hasta que
// entre (con un piso, para que siga siendo legible en la etiqueta).
function fuenteQueEntra(texto: string, anchoDisponible: number, fuenteBase: number): number {
  const FUENTE_MINIMA = 16
  if (!texto) return fuenteBase
  const necesaria = anchoDisponible / (texto.length * ANCHO_CARACTER)
  if (necesaria >= fuenteBase) return fuenteBase
  return Math.max(FUENTE_MINIMA, Math.floor(necesaria))
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
  // Columna derecha para observaciones. Se le dio menos ancho (antes 0,62) para
  // que entren cómodos los valores largos de la izquierda: destinos y razones
  // sociales que se cortaban en una sola línea.
  const divX = Math.round(W * 0.68)
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
  // Filas de datos (etiqueta: valor). La columna del valor arranca donde
  // termina la etiqueta más larga de este rótulo, en vez de una fracción fija:
  // así "Fecha:" no desperdicia el mismo lugar que "N° muestra:".
  const labelX = margin + 12
  const anchoEtiqueta = Math.max(...rows.map(([k]) => k.length), 1) * ANCHO_CARACTER * font
  const valueX = Math.min(Math.round(labelX + anchoEtiqueta + 14), Math.round(divX * 0.5))
  const anchoValor = divX - valueX - 8
  rows.forEach(([k, v], i) => {
    const y = rowsTop + i * step
    const fuenteValor = fuenteQueEntra(zplSafe(v), anchoValor, font)
    zpl.push(`^FO${labelX},${y}^A0N,${font},${font}^FD${zplSafe(k)}:^FS`)
    // Alineado abajo con la etiqueta cuando la letra se achicó, para que la
    // fila no quede escalonada.
    const yValor = y + (font - fuenteValor)
    zpl.push(`^FO${valueX},${yValor}^A0N,${fuenteValor},${fuenteValor}^FB${anchoValor},1,0,L,0^FD${zplSafe(v)}^FS`)
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
