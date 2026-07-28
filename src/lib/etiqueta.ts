import { labelRows, type LabelData } from '@/lib/zpl'

export type EtiquetaConfig = {
  etiquetaAncho: string
  etiquetaAlto: string
  etiquetaFuente: string
  empresa: string
  logo: string
}

// HTML del rótulo para la impresión clásica (ventana + diálogo). La versión
// ZPL para impresión directa en Zebra vive en src/lib/zpl.ts; las dos usan
// las mismas filas (labelRows) para que el contenido no se desalinee.
export function buildLabelHTML(tipo: string, data: LabelData, config: EtiquetaConfig): string {
  const w = config.etiquetaAncho || '100'
  const h = config.etiquetaAlto || '45'
  const fs = Number(config.etiquetaFuente || '9')
  const empresa = config.empresa || 'Laboratorio SFA'
  const logo = config.logo

  const rows = labelRows(tipo, data)

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
    /* Menos ancho que antes (40%) para que entren los valores largos de la
       izquierda; mismo reparto que el ZPL. */
    .obs { width: 32%; border-left: 1px solid #000; padding-left: 5px; display: flex; flex-direction: column; }
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
