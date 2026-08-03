import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildInformeHTML, buildInformeSVG, type InformeTanque } from '@/lib/informe'

// El informe se manda por WhatsApp y se lee en un celular. Estos tests fijan las
// dos cosas de las que depende que se lea sin zoom: el tamaño del texto RELATIVO
// al ancho de la imagen (el teléfono la achica para que entre en la pantalla) y
// el contraste de cada color sobre su fondo.

const INFORME: InformeTanque = {
  empresa: 'GRUPO DH',
  logo: '',
  titulo: 'Informe de análisis de materia prima',
  identificacion: [
    ['Fecha', '27/07/2026'],
    ['Producto', 'Aceite'],
    ['Origen', 'Ecoser'],
    ['HR / Remito', '75627'],
  ],
  resultados: [
    { etiqueta: 'Humedad · Karl Fischer', valor: '1,42', unidad: '%', spec: 'máx. 2,00', fueraDeSpec: false },
    { etiqueta: 'Sedimento por centrífuga', valor: '6,00', unidad: '%', spec: 'máx. 2,00', fueraDeSpec: true },
    { etiqueta: 'Materia grasa', valor: '94,24', unidad: '%', spec: 'mín. 90,00', fueraDeSpec: false },
  ],
  comentario: '',
  pie: 'Generado el 3/8/2026 a las 16:04',
  desvios: ['Sedimento por centrífuga: 6,00 % — máximo 2,00 %'],
}

// Un celular común tiene 390 pt de ancho de viewport. Al abrir la imagen a
// pantalla completa se escala a ese ancho, así que el tamaño con el que se ve
// una letra es fuente × 390 / anchoDeLaImagen.
const ANCHO_CELULAR = 390
const MINIMO_LEGIBLE_PT = 11

function tamanosDeTexto(svg: string): number[] {
  return [...svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]))
}

test('en el celular el texto del informe se ve a tamaño de lectura, sin zoom', () => {
  const { svg, ancho } = buildInformeSVG(INFORME)
  const fuentes = tamanosDeTexto(svg)
  assert.ok(fuentes.length > 0, 'el SVG tiene que traer texto')

  const menor = Math.min(...fuentes)
  const efectivo = (menor * ANCHO_CELULAR) / ancho
  assert.ok(
    efectivo >= MINIMO_LEGIBLE_PT,
    `el texto más chico (${menor} px sobre ${ancho} px de ancho) se ve a ${efectivo.toFixed(1)} pt en un celular; ` +
      `el mínimo legible sin forzar la vista es ${MINIMO_LEGIBLE_PT} pt`
  )
})

test('el cuerpo de los resultados es más grande que el mínimo', () => {
  const { svg, ancho } = buildInformeSVG(INFORME)
  // El valor del resultado es lo que se busca de un vistazo: tiene que ser de
  // los textos más grandes del informe.
  const fila = svg.split('\n').find((l) => l.includes('94,24'))
  assert.ok(fila, 'el resultado tiene que estar en el SVG')
  const fuente = Number(/font-size="(\d+)"/.exec(fila)?.[1])
  assert.ok(
    (fuente * ANCHO_CELULAR) / ancho >= 12,
    `el resultado se ve a ${((fuente * ANCHO_CELULAR) / ancho).toFixed(1)} pt y tendría que llegar a 12`
  )
})

// --- Contraste -------------------------------------------------------------

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2]
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

test('todos los colores del informe llegan al contraste mínimo accesible', () => {
  const { svg } = buildInformeSVG(INFORME)
  const fondoBanda = '#b6394a' // la banda roja de desvío
  const usados = new Set([...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()))

  // Los rellenos que son fondo, no texto, se controlan aparte.
  const fondos = new Set(['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#8bc53f', fondoBanda])
  for (const color of usados) {
    if (fondos.has(color)) continue
    const ratio = contraste(color, '#ffffff')
    assert.ok(ratio >= 4.5, `${color} sobre blanco da ${ratio.toFixed(2)}:1 y el mínimo (WCAG AA) es 4,5:1`)
  }

  // El texto blanco de la banda de desvío, sobre el rojo.
  const enBanda = contraste('#ffffff', fondoBanda)
  assert.ok(enBanda >= 4.5, `el texto de la banda da ${enBanda.toFixed(2)}:1`)
})

test('el gris de las etiquetas no vuelve al valor flojo de antes', () => {
  // #6b7280 daba 4,83:1: pasaba raspando y en el celular al sol no se leía.
  assert.ok(contraste('#6b7280', '#ffffff') < 5, 'el gris viejo estaba al límite')
  assert.ok(contraste('#4b5563', '#ffffff') >= 7, 'el gris nuevo tiene que llegar a 7:1')
  const { svg } = buildInformeSVG(INFORME)
  assert.ok(!svg.includes('#6b7280'), 'el gris flojo no debería quedar en el informe')
})

// --- Que la imagen siga entrando en el ancho ------------------------------

test('nada del informe se sale del ancho de la imagen', () => {
  const { svg, ancho } = buildInformeSVG(INFORME)
  for (const m of svg.matchAll(/<rect x="(\d+)" y="[\d.]+" width="(\d+)"/g)) {
    const fin = Number(m[1]) + Number(m[2])
    assert.ok(fin <= ancho, `un recuadro termina en ${fin} y la imagen mide ${ancho}`)
  }
  // No alcanza con mirar dónde arranca el texto: un valor alineado a la
  // izquierda cerca del margen derecho se sale de la imagen y queda cortado.
  // Se estima también dónde termina.
  for (const m of svg.matchAll(/<text x="([\d.]+)"([^>]*)>([^<]*)<\/text>/g)) {
    const x = Number(m[1])
    const atributos = m[2]
    const contenido = m[3]
    const fuente = Number(/font-size="(\d+)"/.exec(atributos)?.[1] ?? 16)
    const alFinal = atributos.includes('text-anchor="end"')
    const anchoAprox = contenido.length * fuente * 0.52
    const inicio = alFinal ? x - anchoAprox : x
    const fin = alFinal ? x : x + anchoAprox
    assert.ok(inicio >= 0, `"${contenido}" arranca en ${inicio.toFixed(0)}, fuera de la imagen`)
    assert.ok(
      fin <= ancho,
      `"${contenido}" termina en ${fin.toFixed(0)} y la imagen mide ${ancho}: queda cortado en el borde`
    )
  }
})

test('el HTML para imprimir se adapta al celular y no pierde el aviso de desvío', () => {
  const html = buildInformeHTML(INFORME)
  assert.ok(html.includes('name="viewport"'), 'sin viewport el celular achica toda la página')
  assert.ok(html.includes('@media screen and (max-width: 620px)'), 'falta el bloque de pantalla chica')
  // La especificación se muestra abajo del parámetro cuando no hay ancho.
  assert.ok(html.includes('spec-movil'), 'falta la especificación para pantalla chica')
  assert.ok(html.includes('Fuera de especificaci'), 'el desvío tiene que seguir estando')
  // La hoja impresa no se toca.
  assert.ok(html.includes('@page { size: A4;'), 'la hoja A4 tiene que seguir igual')
})

test('el ⚠ queda pegado al nombre del ensayo, no en una línea aparte', () => {
  const html = buildInformeHTML(INFORME)
  // Colgado del <td>, en el celular el ⚠ caía debajo de la especificación
  // (que ahí es un bloque) y quedaba flotando solo.
  assert.ok(html.includes('tr.fuera .param::after'), 'el ⚠ tiene que colgar del nombre del parámetro')
  assert.ok(!html.includes('tr.fuera td:first-child::after'), 'no puede volver a colgar del td')
  assert.ok(html.includes('<span class="param">'), 'el nombre necesita su propio span')
})
