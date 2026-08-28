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
  // En qué orden salen las hojas. Es el del catálogo de ubicaciones, que sigue
  // el recorrido físico. Sin esto las hojas salían en el orden alfabético de
  // los insumos, y la recorrida quedaba en zigzag: Armario, Pañol, Puerta 24,
  // Pañol otra vez, Puerta 23...
  ordenUbicaciones?: string[]
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
  const SIN_UBICACION = 'Sin ubicación'

  const porUbicacion = new Map<string, FilaPlanilla[]>()
  for (const f of filas) {
    const clave = f.ubicacion || SIN_UBICACION
    if (!porUbicacion.has(clave)) porUbicacion.set(clave, [])
    porUbicacion.get(clave)!.push(f)
  }

  // Las hojas salen en el orden del catálogo, que es el del recorrido. Lo que no
  // figure en el catálogo va después, y lo que no tiene ubicación al final de
  // todo: es lo que hay que ir a buscar, no una parada del recorrido.
  const orden = opciones.ordenUbicaciones ?? []
  const posicion = (u: string) => {
    if (u === SIN_UBICACION) return Number.MAX_SAFE_INTEGER
    const i = orden.indexOf(u)
    return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i
  }

  const secciones = [...porUbicacion.entries()]
    .sort(([a], [b]) => posicion(a) - posicion(b) || a.localeCompare(b, 'es'))
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
    /* Todo el papel se mide en milímetros y puntos, no en píxeles. Un píxel de
       CSS depende del escalado de pantalla, y en la app de escritorio —una
       ventana de Electron sobre Windows al 125 % o 150 %— la misma hoja salía
       impresa gigante o diminuta. El milímetro no se mueve. */
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { width: 186mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: ${COLOR_TEXTO}; background: #fff; margin: 0 auto; padding: 0; font-size: 9pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.8mm solid ${COLOR_VERDE}; padding-bottom: 2.5mm; margin-bottom: 1.5mm; }
    .empresa { font-size: 13pt; font-weight: bold; }
    .titulo { font-size: 9pt; color: ${COLOR_SUAVE}; margin-top: 0.5mm; }
    .fecha { font-size: 9pt; color: ${COLOR_SUAVE}; }
    .nota { font-size: 8pt; color: ${COLOR_SUAVE}; margin-bottom: 3.5mm; }
    /* Cada puerta empieza en su hoja: la recorrida se hace de a una. */
    section { break-before: page; page-break-before: always; }
    section:first-of-type { break-before: auto; page-break-before: auto; }
    h2 { font-size: 11pt; margin: 0 0 2mm; text-transform: uppercase; letter-spacing: .05em; }
    .cuenta { font-size: 8pt; color: ${COLOR_SUAVE}; font-weight: normal; text-transform: none; letter-spacing: 0; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9pt; }
    th { text-align: left; background: #f9fafb; color: ${COLOR_SUAVE}; font-weight: bold; padding: 1.5mm 2mm; border-bottom: 0.5mm solid ${COLOR_LINEA}; }
    td { padding: 0 2mm; border-bottom: 0.2mm solid ${COLOR_LINEA}; height: 7mm; overflow-wrap: anywhere; }
    /* Alto fijo y no un input: es para escribir a mano con birome. */
    th.num, td.num { text-align: right; width: 18mm; white-space: nowrap; }
    th.cont, td.cont { width: 22mm; background: #fcfcfc; }
    th.obs, td.obs { width: 40mm; }
    .pres { color: ${COLOR_SUAVE}; font-weight: normal; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    .firma { display: flex; gap: 10mm; margin-top: 6mm; font-size: 8pt; color: ${COLOR_SUAVE}; }
    .firma span { border-bottom: 0.2mm solid ${COLOR_LINEA}; padding-bottom: 0.5mm; min-width: 55mm; }
    /* Barra para revisar antes de gastar dieciocho hojas. No se imprime. */
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
    <span>${porUbicacion.size} hoja(s), ${filas.length} ítems. Revisá antes de imprimir.</span>
    <button type="button" onclick="window.print()">Imprimir</button>
  </div>
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
