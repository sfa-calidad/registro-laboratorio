import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPlanillaHTML, type FilaPlanilla } from '@/lib/planillaRecuento'

// La planilla es lo que se lleva en la mano por el laboratorio: lo que no está
// impreso no se cuenta, y lo que está de más sesga el conteo.

const OPCIONES = { empresa: 'Laboratorio SFA', fecha: '28/08/2026', aCiegas: true }

function fila(over: Partial<FilaPlanilla> = {}): FilaPlanilla {
  return {
    nombre: 'Acido Clorhidrico 37%',
    presentacion: '1 L',
    ubicacion: 'Laboratorio - Armario',
    stock: 5,
    seControla: true,
    ...over,
  }
}

test('a ciegas no se imprime el stock del sistema', () => {
  // Si el número está a la vista, quien cuenta tiende a confirmarlo en vez de
  // contar. Es el motivo de que exista la opción.
  const html = buildPlanillaHTML([fila({ stock: 5 })], { ...OPCIONES, aCiegas: true })
  assert.ok(!html.includes('>5<'), 'no debería aparecer el 5 del sistema')
  assert.ok(!html.includes('Sistema'), 'ni la columna')
  assert.ok(html.includes('Conté'), 'pero sí la casilla para anotar')
})

test('sin "a ciegas" sí aparece, para el control de rutina', () => {
  const html = buildPlanillaHTML([fila({ stock: 5 })], { ...OPCIONES, aCiegas: false })
  assert.ok(html.includes('Sistema'))
  assert.ok(html.includes('>5<'))
})

test('cada ubicación va en su hoja', () => {
  const html = buildPlanillaHTML(
    [
      fila({ nombre: 'Uno', ubicacion: 'Laboratorio - Puerta 1' }),
      fila({ nombre: 'Dos', ubicacion: 'Laboratorio - Puerta 24' }),
      fila({ nombre: 'Tres', ubicacion: 'Laboratorio - Puerta 1' }),
    ],
    OPCIONES,
  )
  const secciones = html.match(/<section>/g) || []
  assert.equal(secciones.length, 2, 'dos ubicaciones, dos secciones')
  assert.ok(html.includes('page-break-before: always'), 'con corte de página entre una y otra')
  // Los tres ítems tienen que estar, agrupados y sin perderse ninguno.
  for (const n of ['Uno', 'Dos', 'Tres']) assert.ok(html.includes(n), `falta ${n}`)
  assert.ok(html.includes('2 ítems'), 'la puerta 1 lleva dos')
})

test('las hojas salen en el orden del recorrido, no en el de los nombres', () => {
  // Las filas llegan ordenadas por nombre de insumo, así que sin el orden del
  // catálogo la recorrida quedaba en zigzag: Armario, Pañol, Puerta 24, Pañol
  // otra vez, Puerta 23...
  const html = buildPlanillaHTML(
    [
      fila({ nombre: 'Aaa', ubicacion: 'Laboratorio - Puerta 24' }),
      fila({ nombre: 'Bbb', ubicacion: 'Laboratorio - Armario' }),
      fila({ nombre: 'Ccc', ubicacion: 'Laboratorio - Puerta 1' }),
    ],
    {
      ...OPCIONES,
      ordenUbicaciones: ['Laboratorio - Armario', 'Laboratorio - Puerta 1', 'Laboratorio - Puerta 24'],
    },
  )
  const hojas = [...html.matchAll(/<h2>(.*?)\s*<span/g)].map((m) => m[1])
  assert.deepEqual(hojas, [
    'Laboratorio - Armario',
    'Laboratorio - Puerta 1',
    'Laboratorio - Puerta 24',
  ])
})

test('lo que no tiene ubicación queda para el final', () => {
  // No es una parada del recorrido: es lo que hay que ir a buscar.
  const html = buildPlanillaHTML(
    [
      fila({ nombre: 'Suelto', ubicacion: null }),
      fila({ nombre: 'Ubicado', ubicacion: 'Laboratorio - Armario' }),
    ],
    { ...OPCIONES, ordenUbicaciones: ['Laboratorio - Armario'] },
  )
  const hojas = [...html.matchAll(/<h2>(.*?)\s*<span/g)].map((m) => m[1])
  assert.deepEqual(hojas, ['Laboratorio - Armario', 'Sin ubicación'])
})

test('lo que no tiene ubicación igual se imprime', () => {
  // Si no saliera, sería justo lo que nunca se cuenta.
  const html = buildPlanillaHTML([fila({ nombre: 'Suelto', ubicacion: null })], OPCIONES)
  assert.ok(html.includes('Sin ubicación'))
  assert.ok(html.includes('Suelto'))
})

test('lo que no se contaba aparece marcado', () => {
  // Se lleva a la recorrida igual: contarlo por primera vez es lo que lo pone
  // bajo control.
  const html = buildPlanillaHTML([fila({ seControla: false })], OPCIONES)
  assert.ok(html.includes('no se contaba'))
})

test('un nombre con caracteres raros no rompe el HTML', () => {
  const html = buildPlanillaHTML(
    [fila({ nombre: 'Acido <fuerte> & "puro"', presentacion: '' })],
    OPCIONES,
  )
  assert.ok(html.includes('&lt;fuerte&gt;'))
  assert.ok(html.includes('&amp;'))
  assert.ok(!html.includes('<fuerte>'), 'no puede quedar una etiqueta suelta')
})

test('la planilla lleva la empresa, la fecha y dónde firmar', () => {
  const html = buildPlanillaHTML([fila()], OPCIONES)
  assert.ok(html.includes('Laboratorio SFA'))
  assert.ok(html.includes('28/08/2026'))
  assert.ok(html.includes('Contó:') && html.includes('Firma:'))
  assert.ok(html.includes('@page { size: A4'), 'sale en A4 como los informes')
})

test('el papel se mide en unidades físicas, no en píxeles', () => {
  // Un píxel de CSS depende del escalado de pantalla: en la app de escritorio,
  // sobre Windows al 150 %, la misma hoja salía gigante. El milímetro no.
  const html = buildPlanillaHTML([fila()], OPCIONES)
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  const enPixeles = [...css.matchAll(/:\s*[^;{}]*?\d+px/g)].map((m) => m[0].trim())
  assert.deepEqual(enPixeles, [], `quedaron medidas en px: ${enPixeles.join(' | ')}`)
})

test('la barra de revisión no se imprime', () => {
  // Está para poder mirar las hojas antes de gastar papel, no para salir en él.
  const html = buildPlanillaHTML([fila()], OPCIONES)
  assert.ok(html.includes('class="barra"'), 'la barra está en pantalla')
  const bloqueImpresion = html.slice(html.indexOf('@media print'))
  assert.ok(bloqueImpresion.includes('.barra { display: none; }'), 'y oculta al imprimir')
})
