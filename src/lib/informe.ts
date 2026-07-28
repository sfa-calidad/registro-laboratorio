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
}

function escaparXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const COLOR_TEXTO = '#2b332a'
const COLOR_SUAVE = '#6b7280'
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
      <td>${escaparXml(r.etiqueta)}</td>
      <td class="num">${escaparXml(r.valor)}${r.unidad ? ` <span class="uni">${escaparXml(r.unidad)}</span>` : ''}</td>
      <td class="spec">${escaparXml(r.spec)}</td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme: light;">
<head>
  <meta charset="utf-8">
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
    tr.fuera td, tr.fuera td.num { color: ${COLOR_ROJO}; }
    tr.fuera td:first-child::after { content: " ⚠"; }
    .comentario { margin-top: 18px; font-size: 13px; }
    .comentario .lbl { display: block; margin-bottom: 4px; }
    .comentario p { margin: 0; white-space: pre-wrap; background: #f9fafb; border-left: 3px solid ${COLOR_LINEA}; padding: 8px 10px; }
    footer { margin-top: 26px; border-top: 1px solid ${COLOR_LINEA}; padding-top: 8px; font-size: 11px; color: ${COLOR_SUAVE}; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="hoja">
    <header>
      ${informe.logo
        ? `<img src="${informe.logo}" alt="${escaparXml(informe.empresa)}">
      <div><div class="titulo solo">${escaparXml(informe.titulo)}</div></div>`
        : `<div>
        <div class="empresa">${escaparXml(informe.empresa)}</div>
        <div class="titulo">${escaparXml(informe.titulo)}</div>
      </div>`}
    </header>
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
export function buildInformeSVG(informe: InformeTanque): { svg: string; ancho: number; alto: number } {
  const ancho = 820
  const margen = 40
  const anchoUtil = ancho - margen * 2

  const partes: string[] = []
  let y = margen

  // Encabezado. Con logo cargado no se repite el nombre de la empresa en
  // texto (el logo ya lo dice): el título pasa a ser el encabezado principal.
  if (informe.logo) {
    partes.push(`<image href="${informe.logo}" x="${margen}" y="${y}" height="48" width="120" preserveAspectRatio="xMinYMid meet"/>`)
    partes.push(`<text x="${margen + 134}" y="${y + 31}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${COLOR_TEXTO}">${escaparXml(informe.titulo)}</text>`)
  } else {
    partes.push(`<text x="${margen}" y="${y + 22}" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="${COLOR_TEXTO}">${escaparXml(informe.empresa)}</text>`)
    partes.push(`<text x="${margen}" y="${y + 42}" font-family="Arial, sans-serif" font-size="13" fill="${COLOR_SUAVE}">${escaparXml(informe.titulo)}</text>`)
  }
  y += 60
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="3" fill="${COLOR_VERDE}"/>`)
  y += 26

  // Identificación en dos columnas
  const colAncho = anchoUtil / 2
  informe.identificacion.forEach(([k, v], i) => {
    const col = i % 2
    const x = margen + col * colAncho
    const fila = Math.floor(i / 2)
    const yy = y + fila * 24
    partes.push(`<text x="${x}" y="${yy}" font-family="Arial, sans-serif" font-size="13" fill="${COLOR_SUAVE}">${escaparXml(k)}</text>`)
    partes.push(`<text x="${x + 118}" y="${yy}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="${COLOR_TEXTO}">${escaparXml(v)}</text>`)
  })
  y += Math.ceil(informe.identificacion.length / 2) * 24 + 16

  // Tabla de resultados
  partes.push(`<text x="${margen}" y="${y}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" letter-spacing="1" fill="${COLOR_SUAVE}">RESULTADOS</text>`)
  y += 14

  const colValor = margen + 380
  const colSpec = margen + 560
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="26" fill="#f9fafb"/>`)
  partes.push(`<text x="${margen + 10}" y="${y + 18}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${COLOR_SUAVE}">Parámetro</text>`)
  partes.push(`<text x="${colValor}" y="${y + 18}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${COLOR_SUAVE}">Resultado</text>`)
  partes.push(`<text x="${colSpec}" y="${y + 18}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${COLOR_SUAVE}">Especificación</text>`)
  y += 26
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="2" fill="${COLOR_LINEA}"/>`)
  y += 2

  if (informe.resultados.length === 0) {
    partes.push(`<text x="${margen + 10}" y="${y + 20}" font-family="Arial, sans-serif" font-size="13" fill="${COLOR_SUAVE}">Sin resultados cargados</text>`)
    y += 30
  } else {
    for (const r of informe.resultados) {
      const color = r.fueraDeSpec ? COLOR_ROJO : COLOR_TEXTO
      partes.push(`<text x="${margen + 10}" y="${y + 19}" font-family="Arial, sans-serif" font-size="13" fill="${color}">${escaparXml(r.etiqueta)}${r.fueraDeSpec ? ' ⚠' : ''}</text>`)
      partes.push(`<text x="${colValor}" y="${y + 19}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="${color}">${escaparXml(r.valor)}${r.unidad ? ` ${escaparXml(r.unidad)}` : ''}</text>`)
      if (r.spec) {
        partes.push(`<text x="${colSpec}" y="${y + 19}" font-family="Arial, sans-serif" font-size="12" fill="${r.fueraDeSpec ? COLOR_ROJO : COLOR_SUAVE}">${escaparXml(r.spec)}</text>`)
      }
      y += 27
      partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="1" fill="#f3f4f6"/>`)
      y += 1
    }
  }

  // Comentario
  if (informe.comentario) {
    y += 28
    partes.push(`<text x="${margen}" y="${y}" font-family="Arial, sans-serif" font-size="12" fill="${COLOR_SUAVE}">Comentario</text>`)
    y += 10
    // Se corta el texto en líneas de ancho aproximado (SVG no reajusta solo).
    const lineas = quebrarTexto(informe.comentario, 92)
    const alto = lineas.length * 18 + 12
    partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="${alto}" fill="#f9fafb"/>`)
    partes.push(`<rect x="${margen}" y="${y}" width="3" height="${alto}" fill="${COLOR_LINEA}"/>`)
    lineas.forEach((l, i) => {
      partes.push(`<text x="${margen + 12}" y="${y + 20 + i * 18}" font-family="Arial, sans-serif" font-size="13" fill="${COLOR_TEXTO}">${escaparXml(l)}</text>`)
    })
    y += alto
  }

  // Pie
  y += 26
  partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="1" fill="${COLOR_LINEA}"/>`)
  y += 18
  partes.push(`<text x="${margen}" y="${y}" font-family="Arial, sans-serif" font-size="11" fill="${COLOR_SUAVE}">${escaparXml(informe.empresa)}</text>`)
  partes.push(`<text x="${ancho - margen}" y="${y}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="${COLOR_SUAVE}">${escaparXml(informe.pie)}</text>`)
  y += margen

  const alto = Math.ceil(y)
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
