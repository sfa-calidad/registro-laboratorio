// El informe de faltantes en papel: la lista que se le pasa a quien compra.
//
// Mismas reglas de impresión que la planilla de recuento
// (src/lib/planillaRecuento.ts): TODO en milímetros y puntos, nunca en píxeles.
// Un píxel de CSS depende del escalado de pantalla, y desde la app de escritorio
// —una ventana de Electron sobre Windows al 125 % o 150 %— la hoja sale impresa
// de otro tamaño. Hay un test que falla si se cuela una medida en px.

import { escaparXml } from '@/lib/texto'
import { ETIQUETA_ESTADO, formatearNumero } from '@/lib/inventario'
import type { FilaFaltante } from '@/lib/faltantes'

export type OpcionesInforme = {
  empresa: string
  fecha: string
}

const COLOR_TEXTO = '#2b332a'
const COLOR_VERDE = '#8bc53f'
const COLOR_SUAVE = '#4b5563'
const COLOR_LINEA = '#d1d5db'
const COLOR_ROJO = '#b6394a'

export function buildFaltantesHTML(filas: FilaFaltante[], opciones: OpcionesInforme): string {
  const cuerpo = filas
    .map((f) => {
      const nombre =
        escaparXml(f.nombre) +
        (f.presentacion ? ` <span class="pres">· ${escaparXml(f.presentacion)}</span>` : '')
      const sinStock = f.estado === 'SIN_STOCK'
      return `<tr${sinStock ? ' class="cero"' : ''}>
        <td>${nombre}</td>
        <td class="ubi">${escaparXml(f.ubicacion || '—')}</td>
        <td class="num">${formatearNumero(f.stock)}</td>
        <td class="num">${f.stockMinimo === null ? '—' : formatearNumero(f.stockMinimo)}</td>
        <td class="est">${ETIQUETA_ESTADO[f.estado]}</td>
      </tr>`
    })
    .join('')

  const sinStock = filas.filter((f) => f.estado === 'SIN_STOCK').length

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Insumos a reponer</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    html, body { width: 182mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: ${COLOR_TEXTO}; background: #fff; margin: 0 auto; padding: 0; font-size: 9pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.8mm solid ${COLOR_VERDE}; padding-bottom: 2.5mm; margin-bottom: 2mm; }
    .empresa { font-size: 13pt; font-weight: bold; }
    .titulo { font-size: 9pt; color: ${COLOR_SUAVE}; margin-top: 0.5mm; }
    .fecha { font-size: 9pt; color: ${COLOR_SUAVE}; }
    .resumen { font-size: 9pt; color: ${COLOR_SUAVE}; margin-bottom: 4mm; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9pt; }
    th { text-align: left; background: #f9fafb; color: ${COLOR_SUAVE}; font-weight: bold; padding: 1.5mm 2mm; border-bottom: 0.5mm solid ${COLOR_LINEA}; }
    td { padding: 1.5mm 2mm; border-bottom: 0.2mm solid ${COLOR_LINEA}; overflow-wrap: anywhere; }
    th.num, td.num { text-align: right; width: 18mm; white-space: nowrap; }
    th.ubi, td.ubi { width: 42mm; color: ${COLOR_SUAVE}; }
    th.est, td.est { width: 24mm; color: ${COLOR_SUAVE}; }
    tr.cero td, tr.cero td.est { color: ${COLOR_ROJO}; font-weight: bold; }
    .pres { color: ${COLOR_SUAVE}; font-weight: normal; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    .firma { display: flex; gap: 10mm; margin-top: 8mm; font-size: 8pt; color: ${COLOR_SUAVE}; }
    .firma span { border-bottom: 0.2mm solid ${COLOR_LINEA}; padding-bottom: 0.5mm; min-width: 55mm; }
    .barra { position: sticky; top: 0; background: ${COLOR_TEXTO}; color: #fff; padding: 3mm; margin-bottom: 4mm; display: flex; justify-content: space-between; align-items: center; gap: 4mm; font-size: 9pt; }
    .barra button { font: inherit; font-weight: bold; background: ${COLOR_VERDE}; color: #fff; border: 0; border-radius: 1.5mm; padding: 2mm 4mm; cursor: pointer; }
    @media print {
      .barra { display: none; }
      html, body { width: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="barra">
    <span>${filas.length} insumo(s) a reponer. Revisá antes de imprimir.</span>
    <button type="button" onclick="window.print()">Imprimir</button>
  </div>
  <header>
    <div>
      <div class="empresa">${escaparXml(opciones.empresa)}</div>
      <div class="titulo">Insumos a reponer</div>
    </div>
    <div class="fecha">${escaparXml(opciones.fecha)}</div>
  </header>
  <div class="resumen">${filas.length} en total${sinStock ? `, de los cuales ${sinStock} están en cero` : ''}.</div>
  <table>
    <thead><tr><th>Insumo</th><th class="ubi">Ubicación</th><th class="num">Hay</th><th class="num">Mínimo</th><th class="est">Estado</th></tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>
  <div class="firma"><span>Pedido por:</span><span>Firma:</span></div>
</body>
</html>`
}
