import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esProductoDelIngreso, productosDelIngreso } from '@/lib/materiaPrima'

// Un camión puede traer dos productos y cada uno se analiza e informa aparte.
// El caso que lo motivó: una borra con sobrenadante de aceite, cargada con
// producto1 = Borra y producto2 = Aceite. Antes el análisis tomaba siempre el
// producto 1 y no había forma de emitir el informe del aceite.

test('un ingreso con dos productos ofrece los dos para analizar', () => {
  assert.deepEqual(productosDelIngreso({ producto1: 'Borra', producto2: 'Aceite' }), ['Borra', 'Aceite'])
})

test('un ingreso de un solo producto ofrece uno', () => {
  assert.deepEqual(productosDelIngreso({ producto1: 'UCO', producto2: null }), ['UCO'])
  assert.deepEqual(productosDelIngreso({ producto1: 'UCO' }), ['UCO'])
  assert.deepEqual(productosDelIngreso({ producto1: 'UCO', producto2: '' }), ['UCO'])
  assert.deepEqual(productosDelIngreso({ producto1: 'UCO', producto2: '   ' }), ['UCO'])
})

test('el mismo producto en los dos campos es un solo producto', () => {
  // Analizar dos veces lo mismo no significa nada, y el único de
  // (ingresoId, producto) lo rechazaría igual.
  assert.deepEqual(productosDelIngreso({ producto1: 'Borra', producto2: 'Borra' }), ['Borra'])
})

test('solo se puede analizar un producto que el camión efectivamente trae', () => {
  const ingreso = { producto1: 'Borra', producto2: 'Aceite' }
  assert.equal(esProductoDelIngreso('Borra', ingreso), true)
  assert.equal(esProductoDelIngreso('Aceite', ingreso), true)
  assert.equal(esProductoDelIngreso('Oleína', ingreso), false, 'no lo trae el camión')
  assert.equal(esProductoDelIngreso('', ingreso), false)
})

test('el producto se compara sin espacios de más', () => {
  assert.equal(esProductoDelIngreso(' Aceite ', { producto1: 'Borra', producto2: 'Aceite' }), true)
})
