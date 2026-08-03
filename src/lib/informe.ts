import { escaparXml, logoSeguro } from '@/lib/texto'

// Informe de un análisis de tanque, para ver todos los parámetros cargados
// (la tabla del listado solo muestra las columnas fijas más usadas) y poder
// llevárselo como PDF o imagen.
//
// El mismo contenido se arma una sola vez (InformeTanque) y se renderiza de
// tres formas: en pantalla (JSX en el componente), en HTML para imprimir /
// guardar como PDF, y en SVG para convertir a PNG con canvas. Así las tres
// vistas no se desincronizan.

export type FilaResultado = {
  etiqueta: string
  valor: string
  unidad: string
  spec: string
  fueraDeSpec: boolean
}

export type InformeTanque = {
  empresa: string
  logo: string
  titulo: string
  identificacion: [string, string][]
  resultados: FilaResultado[]
  comentario: string
  pie: string
  // Desvíos, uno por parámetro fuera de especificación. Van en una banda roja
  // arriba de todo: el informe de materia prima se manda como foto al
  // proveedor y el desvío tiene que leerse sin buscarlo en la tabla.
  desvios?: string[]
}

const COLOR_TEXTO = '#2b332a'
// Gris de etiquetas y datos secundarios. Era #6b7280, que sobre blanco da 4,8:1
// —apenas por encima del mínimo— y en el celular, con brillo bajo o al sol, se
// pierde. #4b5563 llega a 7,5:1 sin dejar de leerse como texto secundario.
const COLOR_SUAVE = '#4b5563'
const COLOR_LINEA = '#d1d5db'
const COLOR_VERDE = '#8bc53f'
const COLOR_ROJO = '#b6394a'

export function buildInformeHTML(informe: InformeTanque): string {
  const ident = informe.identificacion
    .map(([k, v]) => `<div class="campo"><span class="lbl">${escaparXml(k)}</span><span class="val">${escaparXml(v)}</span></div>`)
    .join('')

  const filas = informe.resultados
    .map(
      (r) => `<tr class="${r.fueraDeSpec ? 'fuera' : ''}">
      <td><span class="param">${escaparXml(r.etiqueta)}</span>${
        r.spec && r.spec !== '—'
          ? `<span class="spec-movil">Especificación: ${escaparXml(r.spec)}</span>`
          : ''
      }</td>
      <td class="num">${escaparXml(r.valor)}${r.unidad ? ` <span class="uni">${escaparXml(r.unidad)}</span>` : ''}</td>
      <td class="spec">${escaparXml(r.spec)}</td>
    </tr>`
    )
    .join('')

  const desvios = (informe.desvios ?? []).length
    ? `<div class="desvios"><div class="t">&#9888; Fuera de especificaci\u00f3n</div><ul>${informe
        .desvios!.map((d) => `<li>${escaparXml(d)}</li>`)
        .join('')}</ul></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme: light;">
<head>
  <meta charset="utf-8">
  <!-- Sin esto el celular renderiza la página a 980 px y la achica: todo el
       texto queda diminuto aunque el CSS diga otra cosa. -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escaparXml(informe.titulo)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: ${COLOR_TEXTO}; background: #fff; margin: 0; padding: 24px; }
    .hoja { max-width: 760px; margin: 0 auto; }
    header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid ${COLOR_VERDE}; padding-bottom: 12px; margin-bottom: 18px; }
    header img { max-height: 52px; max-width: 130px; object-fit: contain; }
    .empresa { font-size: 19px; font-weight: bold; }
    .titulo { font-size: 13px; color: ${COLOR_SUAVE}; margin-top: 2px; }
    /* Con logo cargado, el nombre de la empresa no se repite en texto: el
       título queda como encabezado principal. */
    .titulo.solo { font-size: 17px; font-weight: bold; color: ${COLOR_TEXTO}; margin-top: 0; }
    .desvios { background: ${COLOR_ROJO}; color: #fff; border-radius: 6px; padding: 11px 14px; margin-bottom: 16px; }
    .desvios .t { font-size: 14px; font-weight: bold; }
    .desvios ul { margin: 5px 0 0; padding-left: 18px; font-size: 13px; }
    .ident { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 20px; }
    .campo { display: flex; gap: 6px; font-size: 13px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
    .lbl { color: ${COLOR_SUAVE}; min-width: 110px; }
    .val { font-weight: bold; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: ${COLOR_SUAVE}; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; background: #f9fafb; color: ${COLOR_SUAVE}; font-weight: bold; padding: 7px 10px; border-bottom: 2px solid ${COLOR_LINEA}; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
    td.num { font-weight: bold; white-space: nowrap; }
    .uni { font-weight: normal; color: ${COLOR_SUAVE}; font-size: 12px; }
    td.spec { color: ${COLOR_SUAVE}; font-size: 12px; }
    .spec-movil { display: none; }
    tr.fuera td, tr.fuera td.num { color: ${COLOR_ROJO}; }
    tr.fuera .param::after { content: " ⚠"; }
    .comentario { margin-top: 18px; font-size: 13px; }
    .comentario .lbl { display: block; margin-bottom: 4px; }
    .comentario p { margin: 0; white-space: pre-wrap; background: #f9fafb; border-left: 3px solid ${COLOR_LINEA}; padding: 8px 10px; }
    footer { margin-top: 26px; border-top: 1px solid ${COLOR_LINEA}; padding-top: 8px; font-size: 11px; color: ${COLOR_SUAVE}; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    /* En pantalla chica: una sola columna y cuerpo de 16 px, que es el tamaño
       de lectura normal en un celular. La hoja impresa no cambia: esto es
       @media screen. */
    @media screen and (max-width: 620px) {
      body { padding: 14px; font-size: 16px; }
      .empresa { font-size: 22px; }
      .titulo.solo { font-size: 19px; }
      .desvios .t { font-size: 17px; }
      .desvios ul { font-size: 16px; }
      .ident { grid-template-columns: 1fr; gap: 8px; }
      .campo { font-size: 16px; }
      .lbl { min-width: 128px; }
      h2 { font-size: 15px; }
      table { font-size: 16px; }
      th { padding: 8px 6px; font-size: 14px; }
      td { padding: 10px 6px; }
      /* La especificación pasa debajo del parámetro: tres columnas no entran
         a lo ancho de un celular sin cortar los nombres de los ensayos. El ⚠
         de las filas fuera de spec lo sigue poniendo el ::after de siempre. */
      thead th:last-child { display: none; }
      td.spec { display: none; }
      .spec-movil { display: block; font-size: 14px; color: ${COLOR_SUAVE}; margin-top: 3px; }
      tr.fuera .spec-movil { color: ${COLOR_ROJO}; }
      .uni { font-size: 14px; }
      .comentario, .comentario p { font-size: 16px; }
      footer { flex-direction: column; gap: 4px; font-size: 13px; }
    }
  </style>
</head>
<body>
  <div class="hoja">
    <header>
      ${informe.logo
        ? `<img src="${escaparXml(logoSeguro(informe.logo))}" alt="${escaparXml(informe.empresa)}">
      <div><div class="titulo solo">${escaparXml(informe.titulo)}</div></div>`
        : `<div>
        <div class="empresa">${escaparXml(informe.empresa)}</div>
        <div class="titulo">${escaparXml(informe.titulo)}</div>
      </div>`}
    </header>
    ${desvios}
    <div class="ident">${ident}</div>
    <h2>Resultados</h2>
    <table>
      <thead><tr><th>Parámetro</th><th>Resultado</th><th>Especificación</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="3">Sin resultados cargados</td></tr>'}</tbody>
    </table>
    ${informe.comentario ? `<div class="comentario"><span class="lbl">Comentario</span><p>${escaparXml(informe.comentario)}</p></div>` : ''}
    <footer><span>${escaparXml(informe.empresa)}</span><span>${escaparXml(informe.pie)}</span></footer>
  </div>
</body>
</html>`
}

// SVG del informe, pensado para pasarlo a PNG con canvas. Se usa solo texto y
// formas (nada de foreignObject) para que el canvas no quede "tainted" y
// toBlob() pueda exportar la imagen.
//
// El formato es angosto a propósito. Esta imagen se manda por WhatsApp y se lee
// en un celular: lo que importa no es el tamaño de la letra en píxeles sino su
// tamaño RELATIVO al ancho de la imagen, porque el celular la achica para que
// entre en la pantalla. Con 820 px de ancho y cuerpo de 13 px, en un teléfono de
// 390 pt el texto se veía a 6 pt y había que hacer zoom. Con 560 de ancho y
// cuerpo de 18 se ve a 12,5 pt, que es tamaño de lectura normal.
const ANCHO_SVG = 560
const MARGEN_SVG = 26

// Proporción 4:5 (alto = ancho × 1,25). Es la más alta que WhatsApp e Instagram
// muestran entera en la vista previa: más que eso y la miniatura sale recortada.
// Un informe corto se rellena con blanco hasta llegar; uno largo se deja crecer.
// Ensancharlo para forzar el 4:5 achicaría la letra respecto del ancho, que es
// justamente lo que hace que haya que hacer zoom.
const PROPORCION_OBJETIVO = 1.25

// Arial no tiene ancho fijo; 0,52 del cuerpo es el promedio para texto en
// castellano y alcanza para decidir dónde cortar una línea.
const RELACION_ANCHO_CARACTER = 0.52

function anchoDeTexto(texto: string, fuente: number): number {
  return texto.length * fuente * RELACION_ANCHO_CARACTER
}

function quebrarPorAncho(texto: string, anchoDisponible: number, fuente: number): string[] {
  return quebrarTexto(texto, Math.max(8, Math.floor(anchoDisponible / (fuente * RELACION_ANCHO_CARACTER))))
}

function texto(
  contenido: string,
  x: number,
  y: number,
  opciones: { fuente: number; color: string; negrita?: boolean; fin?: boolean; espaciado?: number } = {
    fuente: 18,
    color: COLOR_TEXTO,
  }
): string {
  const { fuente, color, negrita, fin, espaciado } = opciones
  return (
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fuente}"` +
    `${negrita ? ' font-weight="bold"' : ''}${fin ? ' text-anchor="end"' : ''}` +
    `${espaciado ? ` letter-spacing="${espaciado}"` : ''} fill="${color}">${escaparXml(contenido)}</text>`
  )
}

export function buildInformeSVG(informe: InformeTanque): { svg: string; ancho: number; alto: number } {
  const ancho = ANCHO_SVG
  const margen = MARGEN_SVG
  const anchoUtil = ancho - margen * 2
  const derecha = ancho - margen

  const partes: string[] = []
  let y = margen

  // Encabezado. Con logo cargado no se repite el nombre de la empresa en
  // texto (el logo ya lo dice): el título pasa a ser el encabezado principal.
  if (informe.logo) {
    partes.push(`<image href="${escaparXml(logoSeguro(informe.logo))}" x="${margen}" y="${y}" height="46" width="112" preserveAspectRatio="xMinYMid meet"/>`)
    // El título entra debajo del logo si no le queda lugar al costado.
    const anchoTitulo = anchoUtil - 124
    const lineas = quebrarPorAncho(informe.titulo, anchoTitulo, 19)
    lineas.forEach((l, i) => {
      partes.push(texto(l, margen + 124, y + 27 + i * 23, { fuente: 19, color: COLOR_TEXTO, negrita: true }))
    })
    y += Math.max(46, lineas.length * 23 + 12)
  } else {
    partes.push(texto(informe.empresa, margen, y + 24, { fuente: 26, color: COLOR_TEXTO, negrita: true }))
    partes.push(texto(informe.titulo, margen, y + 48, { fuente: 17, color: COLOR_SUAVE }))
    y += 60
  }
  y += 12
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="4" fill="${COLOR_VERDE}"/>`)
  y += 26

  // Banda de desvíos. Va antes de la identificación para que sea lo primero
  // que se ve en la foto que se manda al proveedor.
  const desvios = informe.desvios ?? []
  if (desvios.length) {
    const anchoLinea = anchoUtil - 28
    const lineas = desvios.flatMap((d) => quebrarPorAncho(d, anchoLinea, 17))
    const altoBanda = 34 + lineas.length * 23 + 12
    partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="${altoBanda}" rx="8" fill="${COLOR_ROJO}"/>`)
    partes.push(texto('\u26a0 Fuera de especificación', margen + 14, y + 26, { fuente: 19, color: '#ffffff', negrita: true }))
    lineas.forEach((l, i) => {
      partes.push(texto(l, margen + 14, y + 52 + i * 23, { fuente: 17, color: '#ffffff' }))
    })
    y += altoBanda + 20
  }

  // Identificación en una sola columna: en dos, cada valor quedaba con la mitad
  // del ancho y había que achicar la letra para que entrara.
  const xValor = margen + 132
  for (const [k, v] of informe.identificacion) {
    partes.push(texto(k, margen, y + 16, { fuente: 16, color: COLOR_SUAVE }))
    for (const [i, l] of quebrarPorAncho(v, anchoUtil - 132, 18).entries()) {
      partes.push(texto(l, xValor, y + 16 + i * 22, { fuente: 18, color: COLOR_TEXTO, negrita: true }))
      if (i > 0) y += 22
    }
    y += 26
    partes.push(`<rect x="${margen}" y="${y - 6}" width="${anchoUtil}" height="1" fill="#e5e7eb"/>`)
  }
  y += 28

  // Resultados: parámetro a la izquierda y valor pegado al margen derecho, con
  // la especificación debajo en chico. Tres columnas no entran en un ancho de
  // celular sin cortar los nombres largos de los ensayos.
  partes.push(texto('RESULTADOS', margen, y, { fuente: 16, color: COLOR_SUAVE, negrita: true, espaciado: 1 }))
  y += 12

  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="30" fill="#f3f4f6"/>`)
  partes.push(texto('Parámetro', margen + 12, y + 20, { fuente: 16, color: COLOR_SUAVE, negrita: true }))
  partes.push(texto('Resultado', derecha - 12, y + 20, { fuente: 16, color: COLOR_SUAVE, negrita: true, fin: true }))
  y += 30
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="2" fill="${COLOR_LINEA}"/>`)
  y += 2

  if (informe.resultados.length === 0) {
    partes.push(texto('Sin resultados cargados', margen + 12, y + 24, { fuente: 17, color: COLOR_SUAVE }))
    y += 34
  } else {
    for (const r of informe.resultados) {
      const color = r.fueraDeSpec ? COLOR_ROJO : COLOR_TEXTO
      const valor = `${r.valor}${r.unidad ? ` ${r.unidad}` : ''}`
      // Lo que ocupa el valor se le descuenta al nombre para que no se pisen.
      const anchoNombre = anchoUtil - 24 - anchoDeTexto(valor, 18) - 16
      const lineas = quebrarPorAncho(`${r.etiqueta}${r.fueraDeSpec ? ' \u26a0' : ''}`, anchoNombre, 18)
      lineas.forEach((l, i) => {
        partes.push(texto(l, margen + 12, y + 24 + i * 22, { fuente: 18, color }))
      })
      partes.push(texto(valor, derecha - 12, y + 24, { fuente: 19, color, negrita: true, fin: true }))
      y += 24 + (lineas.length - 1) * 22
      if (r.spec && r.spec !== '—') {
        partes.push(texto(`Especificación: ${r.spec}`, margen + 12, y + 20, {
          fuente: 16,
          color: r.fueraDeSpec ? COLOR_ROJO : COLOR_SUAVE,
        }))
        y += 21
      }
      y += 11
      partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="1" fill="#e5e7eb"/>`)
      y += 1
    }
  }

  // Comentario
  if (informe.comentario) {
    y += 26
    partes.push(texto('Comentario', margen, y, { fuente: 16, color: COLOR_SUAVE }))
    y += 12
    const lineas = quebrarPorAncho(informe.comentario, anchoUtil - 26, 17)
    const altoCaja = lineas.length * 23 + 16
    partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="${altoCaja}" fill="#f3f4f6"/>`)
    partes.push(`<rect x="${margen}" y="${y}" width="4" height="${altoCaja}" fill="${COLOR_LINEA}"/>`)
    lineas.forEach((l, i) => {
      partes.push(texto(l, margen + 14, y + 26 + i * 23, { fuente: 17, color: COLOR_TEXTO }))
    })
    y += altoCaja
  }

  // El pie ocupa: separación + línea + empresa + fecha + margen inferior.
  const ALTO_PIE = 26 + 42 + margen
  const altoNatural = Math.ceil(y + ALTO_PIE)
  // Si el contenido no llega al 4:5, la imagen se completa con blanco. Si lo
  // pasa, se deja crecer: la letra no se toca.
  const alto = Math.max(altoNatural, Math.round(ancho * PROPORCION_OBJETIVO))

  // Pie anclado abajo, para que el blanco de relleno quede entre el contenido y
  // el pie y no colgando al final. En una sola línea no entran empresa y fecha
  // en 560 px, así que van una debajo de la otra.
  const yLinea = Math.max(y + 26, alto - margen - 42)
  partes.push(`<rect x="${margen}" y="${yLinea}" width="${anchoUtil}" height="1" fill="${COLOR_LINEA}"/>`)
  partes.push(texto(informe.empresa, margen, yLinea + 22, { fuente: 16, color: COLOR_SUAVE }))
  partes.push(texto(informe.pie, margen, yLinea + 42, { fuente: 16, color: COLOR_SUAVE }))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <rect width="${ancho}" height="${alto}" fill="#ffffff"/>
  ${partes.join('\n  ')}
</svg>`
  return { svg, ancho, alto }
}

function quebrarTexto(texto: string, maxCaracteres: number): string[] {
  const lineas: string[] = []
  for (const parrafo of texto.split('\n')) {
    let actual = ''
    for (const palabra of parrafo.split(/\s+/)) {
      if ((actual + ' ' + palabra).trim().length > maxCaracteres) {
        if (actual) lineas.push(actual)
        actual = palabra
      } else {
        actual = (actual + ' ' + palabra).trim()
      }
    }
    lineas.push(actual)
  }
  return lineas
}
