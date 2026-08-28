// Planilla de recuento en papel, para la recorrida por el laboratorio.
//
// Misma salida A4 que los informes (src/lib/informe.ts): HTML + window.print().
// Una sección por ubicación, con corte de página, porque la recorrida se hace
// puerta por puerta.

import { escaparXml } from '@/lib/texto'
import { formatearNumero } from '@/lib/inventario'

export type FilaPlanilla = {
  nombre: string
  presentacion: string
  ubicacion: string | null
  stock: number
  seControla: boolean
}

export type OpcionesPlanilla = {
  empresa: string
  fecha: string
  // Contar sin ver el número del sistema. Si se muestra, quien cuenta tiende a
  // confirmarlo en vez de contar: es el sesgo clásico del control de inventario.
  // Se decide al imprimir según sea un control de rutina o uno en serio.
  aCiegas: boolean
}

const COLOR_TEXTO = '#2b332a'
const COLOR_VERDE = '#8bc53f'
const COLOR_SUAVE = '#4b5563'
const COLOR_LINEA = '#d1d5db'

function seccion(ubicacion: string, filas: FilaPlanilla[], opciones: OpcionesPlanilla): string {
  const cabecera = opciones.aCiegas
    ? '<th class="cont">Conté</th><th class="obs">Observación</th>'
    : '<th class="num">Sistema</th><th class="cont">Conté</th><th class="obs">Observación</th>'

  const cuerpo = filas
    .map((f) => {
      const nombre =
        escaparXml(f.nombre) +
        (f.presentacion ? ` <span class="pres">· ${escaparXml(f.presentacion)}</span>` : '') +
        (f.seControla ? '' : ' <span class="pres">(no se contaba)</span>')
      const sistema = opciones.aCiegas ? '' : `<td class="num">${formatearNumero(f.stock)}</td>`
      return `<tr><td>${nombre}</td>${sistema}<td class="cont"></td><td class="obs"></td></tr>`
    })
    .join('')

  return `<section>
  <h2>${escaparXml(ubicacion)} <span class="cuenta">${filas.length} ítems</span></h2>
  <table>
    <thead><tr><th>Insumo</th>${cabecera}</tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>
  <div class="firma"><span>Contó:</span><span>Firma:</span></div>
</section>`
}

export function buildPlanillaHTML(filas: FilaPlanilla[], opciones: OpcionesPlanilla): string {
  // Agrupado por ubicación, en el orden en que vienen las filas (el que fija el
  // catálogo), y lo que no tiene ubicación al final.
  const porUbicacion = new Map<string, FilaPlanilla[]>()
  for (const f of filas) {
    const clave = f.ubicacion || 'Sin ubicación'
    if (!porUbicacion.has(clave)) porUbicacion.set(clave, [])
    porUbicacion.get(clave)!.push(f)
  }

  const secciones = [...porUbicacion.entries()]
    .map(([ubicacion, suyas]) => seccion(ubicacion, suyas, opciones))
    .join('')

  const nota = opciones.aCiegas
    ? 'Planilla a ciegas: anotá lo que contás sin mirar lo que dice el sistema.'
    : 'La columna "Sistema" es lo que hay cargado hoy.'

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme: light;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Recuento de insumos</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: ${COLOR_TEXTO}; background: #fff; margin: 0; padding: 20px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${COLOR_VERDE}; padding-bottom: 10px; margin-bottom: 6px; }
    .empresa { font-size: 18px; font-weight: bold; }
    .titulo { font-size: 12px; color: ${COLOR_SUAVE}; margin-top: 2px; }
    .fecha { font-size: 12px; color: ${COLOR_SUAVE}; }
    .nota { font-size: 11px; color: ${COLOR_SUAVE}; margin-bottom: 14px; }
    /* Cada puerta empieza en su hoja: la recorrida se hace de a una. */
    section { break-before: page; page-break-before: always; }
    section:first-of-type { break-before: auto; page-break-before: auto; }
    h2 { font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .05em; }
    .cuenta { font-size: 11px; color: ${COLOR_SUAVE}; font-weight: normal; text-transform: none; letter-spacing: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #f9fafb; color: ${COLOR_SUAVE}; font-weight: bold; padding: 6px 8px; border-bottom: 2px solid ${COLOR_LINEA}; }
    td { padding: 0 8px; border-bottom: 1px solid ${COLOR_LINEA}; height: 26px; }
    /* Alto fijo y no un input: es para escribir a mano con birome. */
    th.num, td.num { text-align: right; width: 70px; white-space: nowrap; }
    th.cont, td.cont { width: 80px; background: #fcfcfc; }
    th.obs, td.obs { width: 150px; }
    .pres { color: ${COLOR_SUAVE}; font-weight: normal; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    .firma { display: flex; gap: 40px; margin-top: 22px; font-size: 11px; color: ${COLOR_SUAVE}; }
    .firma span { border-bottom: 1px solid ${COLOR_LINEA}; padding-bottom: 2px; min-width: 200px; }
    @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="empresa">${escaparXml(opciones.empresa)}</div>
      <div class="titulo">Recuento físico de insumos</div>
    </div>
    <div class="fecha">${escaparXml(opciones.fecha)}</div>
  </header>
  <div class="nota">${nota}</div>
  ${secciones}
</body>
</html>`
}
