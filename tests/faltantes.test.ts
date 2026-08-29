import { test } from 'node:test'
import assert from 'node:assert/strict'
import { faltantes, textoDeChecklist, tituloDeTarea, type InsumoFaltante } from '@/lib/faltantes'
import { buildFaltantesHTML } from '@/lib/informeFaltantes'

function insumo(over: Partial<InsumoFaltante> = {}): InsumoFaltante {
  return {
    id: 1,
    nombre: 'Acido Nitrico 65%',
    presentacion: '1 L',
    categoria: 'REACTIVO',
    ubicacion: 'Laboratorio - Armario',
    stock: 2,
    stockMinimo: 3,
    seControla: true,
    ...over,
  }
}

// --- La lista -----------------------------------------------------------------

test('entra lo que está en cero y lo que está bajo el mínimo', () => {
  const lista = faltantes([
    insumo({ id: 1, nombre: 'Bajo', stock: 2, stockMinimo: 3 }),
    insumo({ id: 2, nombre: 'Justo', stock: 3, stockMinimo: 3 }),
    insumo({ id: 3, nombre: 'Sobrado', stock: 9, stockMinimo: 3 }),
    insumo({ id: 4, nombre: 'Cero', stock: 0, stockMinimo: null }),
  ])
  assert.deepEqual(lista.map((f) => f.nombre), ['Cero', 'Bajo', 'Justo'])
  assert.ok(!lista.some((f) => f.nombre === 'Sobrado'))
})

test('primero lo que se agotó: frena un ensayo hoy', () => {
  const lista = faltantes([
    insumo({ id: 1, nombre: 'Aaa bajo mínimo', stock: 2, stockMinimo: 3 }),
    insumo({ id: 2, nombre: 'Zzz en cero', stock: 0, stockMinimo: 3 }),
  ])
  assert.deepEqual(lista.map((f) => f.nombre), ['Zzz en cero', 'Aaa bajo mínimo'])
  assert.equal(lista[0].estado, 'SIN_STOCK')
  assert.equal(lista[1].estado, 'BAJO_MINIMO')
})

test('lo que no se cuenta acá no entra en un pedido de reposición', () => {
  // Acetona y Hexano se piden a pañol: figuran en cero pero no los compra el
  // laboratorio.
  const lista = faltantes([insumo({ nombre: 'Acetona', stock: 0, stockMinimo: null, seControla: false })])
  assert.deepEqual(lista, [])
})

test('sin faltantes, la lista queda vacía y no rompe', () => {
  assert.deepEqual(faltantes([insumo({ stock: 10, stockMinimo: 3 })]), [])
  assert.deepEqual(faltantes([]), [])
})

// --- Lo que va al tablero -----------------------------------------------------

test('cada renglón de la tarea se lee sin el informe al lado', () => {
  // La tarea la abre quien compra, que no tiene la pantalla de insumos delante.
  const [f] = faltantes([insumo({ stock: 2, stockMinimo: 3 })])
  assert.equal(textoDeChecklist(f), 'Acido Nitrico 65% · 1 L — hay 2, mínimo 3')
})

test('un insumo sin presentación ni mínimo también se escribe entero', () => {
  const [f] = faltantes([insumo({ nombre: 'Acetona', presentacion: '', stock: 0, stockMinimo: null })])
  assert.equal(textoDeChecklist(f), 'Acetona — sin stock')
})

test('el título dice cuántos son, para no tener que abrirla', () => {
  assert.equal(tituloDeTarea(12), 'Reponer insumos (12)')
})

// --- El informe en papel ------------------------------------------------------

test('el informe lleva las dos cifras de cada faltante', () => {
  const html = buildFaltantesHTML(faltantes([insumo({ stock: 2, stockMinimo: 3 })]), {
    empresa: 'Laboratorio SFA',
    fecha: '29/08/2026',
  })
  assert.ok(html.includes('Acido Nitrico 65%'))
  assert.ok(html.includes('>Hay<') && html.includes('>Mínimo<'), 'las dos columnas')
  assert.ok(html.includes('Laboratorio - Armario'))
  assert.ok(html.includes('Laboratorio SFA') && html.includes('29/08/2026'))
  assert.ok(html.includes('Pedido por:'), 'va firmado, se le pasa a compras')
})

test('lo que está en cero se distingue del resto', () => {
  const html = buildFaltantesHTML(
    faltantes([
      insumo({ id: 1, nombre: 'Agotado', stock: 0, stockMinimo: 3 }),
      insumo({ id: 2, nombre: 'Poquito', stock: 2, stockMinimo: 3 }),
    ]),
    { empresa: 'SFA', fecha: '29/08/2026' },
  )
  assert.equal((html.match(/<tr class="cero">/g) || []).length, 1)
  assert.ok(html.includes('1 están en cero'))
})

test('el informe se mide en unidades físicas, no en píxeles', () => {
  // Misma regla que la planilla de recuento: un píxel depende del escalado de
  // pantalla y desde la app de escritorio la hoja salía de otro tamaño.
  const html = buildFaltantesHTML(faltantes([insumo()]), { empresa: 'SFA', fecha: '29/08/2026' })
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  const enPixeles = [...css.matchAll(/:\s*[^;{}]*?\d+px/g)].map((m) => m[0].trim())
  assert.deepEqual(enPixeles, [], `quedaron medidas en px: ${enPixeles.join(' | ')}`)
})

test('un nombre con caracteres raros no rompe el informe', () => {
  const html = buildFaltantesHTML(
    faltantes([insumo({ nombre: 'Acido <fuerte> & "puro"', presentacion: '' })]),
    { empresa: 'SFA', fecha: '29/08/2026' },
  )
  assert.ok(html.includes('&lt;fuerte&gt;') && html.includes('&amp;'))
  assert.ok(!html.includes('<fuerte>'))
})
