import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  corteRapido,
  fueraDeRango,
  rangoDe,
  textoSpec,
  materiaGrasa,
  parseNumero,
  porGravimetria,
  prepararSulfurico,
  textoDesvio,
} from '@/lib/calculos'

// Los ocho bloques del Excel "Reporte de calidad", tal como están cargados:
// [etiqueta, humedad, ins. hexano, ins. acetona, materia grasa declarada]
const BLOQUES_DEL_EXCEL: [string, number, number | null, number | null, number][] = [
  ['Ecoser · Aceite', 1.42, 0.5, 4.34, 94.24],
  ['Glardon · Ácido graso', 1.93, 0.17, 0.17, 97.9],
  ['Falavigna · Aceite', 0.48, 0.09, 1.26, 98.26],
  ['Mustafa · UCO', 3.41, 0.18, 0.56, 96.03],
  ['Zona Corrientes · UCO', 6.7, 0.77, 1.23, 92.07],
  ['Carlos Sbarra · Aceite', 0.53, 1.02, 4.74, 94.73],
  ['LA MORERA · Borra', 42.55, null, 19.45, 38.0],
]

test('la materia grasa reproduce los bloques reales del Excel', () => {
  for (const [etiqueta, humedad, hexano, acetona, esperada] of BLOQUES_DEL_EXCEL) {
    assert.equal(materiaGrasa(humedad, [hexano, acetona]), esperada, etiqueta)
  }
})

test('la materia grasa toma el MAYOR de los insolubles', () => {
  // Si tomara el de hexano daría 98,86 y no es lo que dice la planilla.
  assert.equal(materiaGrasa(1.42, [0.5, 4.34]), 94.24)
  assert.equal(materiaGrasa(1.42, [4.34, 0.5]), 94.24, 'el orden no importa')
})

test('sin humedad o sin insolubles no hay materia grasa, y no es cero', () => {
  assert.equal(materiaGrasa(null, [0.5, 4.34]), null)
  assert.equal(materiaGrasa(1.42, []), null)
  assert.equal(materiaGrasa(1.42, [null, null]), null)
  // Con un solo insoluble cargado sí se puede.
  assert.equal(materiaGrasa(42.55, [null, 19.45]), 38.0)
})

test('el corte rápido de borras da los números de la hoja "Materia Prima"', () => {
  // Aceite 7,5 · sedimento 20 · agua 22,5
  const r = corteRapido(7.5, 20, 22.5)
  assert.equal(r.baseHumeda, 15.0, '7,5 / 50')
  assert.equal(r.baseSeca, 27.3, '7,5 / 27,5')
})

test('el corte rápido no divide por cero', () => {
  assert.deepEqual(corteRapido(0, 0, 0), { baseHumeda: null, baseSeca: null })
  assert.equal(corteRapido(0, 0, 30).baseSeca, null, 'sin aceite ni sedimento no hay base seca')
})

test('la preparación del sulfúrico da lo de la planilla', () => {
  // 210 ml al 3,5 %
  assert.deepEqual(prepararSulfurico(210, 3.5), { aguaBidestilada: 21, sulfurico: 7.35 })
})

test('el análisis de goma por gravimetría', () => {
  // Peso de muestra 1,858 · falcón 131,111 → 131,7845
  assert.equal(porGravimetria(1.858, 131.111, 131.7845), 36.25)
  assert.equal(porGravimetria(0, 1, 2), null, 'sin muestra no hay resultado')
})

test('fueraDeRango respeta mínimos y máximos, y los bordes están dentro', () => {
  assert.equal(fueraDeRango(4.34, { min: null, max: 2.5 }), true)
  assert.equal(fueraDeRango(2.5, { min: null, max: 2.5 }), false, 'el borde no está fuera')
  assert.equal(fueraDeRango(89, { min: 90, max: null }), true)
  assert.equal(fueraDeRango(90, { min: 90, max: null }), false)
  assert.equal(fueraDeRango(5, { min: 1, max: 10 }), false)
  // Sin valor o sin especificación no se puede decir que esté fuera.
  assert.equal(fueraDeRango(null, { min: 0, max: 1 }), false)
  assert.equal(fueraDeRango(999, undefined), false)
})

test('el texto del desvío nombra el límite que se pasó', () => {
  assert.equal(
    textoDesvio('Insolubles en acetona', 4.34, { min: null, max: 2.5 }, '%'),
    'Insolubles en acetona: 4,34 % — máximo 2,50 %'
  )
  assert.equal(
    textoDesvio('Materia grasa', 88, { min: 90, max: null }, '%'),
    'Materia grasa: 88,00 % — mínimo 90,00 %'
  )
})

test('parseNumero acepta la coma decimal que se usa en el laboratorio', () => {
  assert.equal(parseNumero('4,34'), 4.34)
  assert.equal(parseNumero('4.34'), 4.34)
  assert.equal(parseNumero('  6 '), 6)
  assert.equal(parseNumero(''), null)
  assert.equal(parseNumero('OK'), null)
  assert.equal(parseNumero('1,2,3'), null)
})


// --- Cómo se escribe una especificación ------------------------------------

test('una especificación con un solo límite no se escribe como rango', () => {
  // El informe de tanques imprimía "— a 3" cuando solo había máximo.
  assert.equal(textoSpec({ min: null, max: 3 }), 'máx. 3,00')
  assert.equal(textoSpec({ min: 90, max: null }), 'mín. 90,00')
  assert.equal(textoSpec({ min: 1, max: 5 }), '1,00 a 5,00')
  assert.equal(textoSpec(undefined), '—')
  assert.equal(textoSpec({ min: null, max: null }), '—')
})

test('la especificación respeta los decimales del parámetro', () => {
  assert.equal(textoSpec({ min: null, max: 20 }, 0), 'máx. 20')
  assert.equal(textoSpec({ min: null, max: 0.5 }, 3), 'máx. 0,500')
})

test('dos casillas vacías no son un rango sin límites', () => {
  // Si lo fueran, cualquier valor daría "dentro de especificación" y la app
  // diría que está conforme sin haber comparado contra nada.
  assert.equal(rangoDe(null, null), undefined)
  assert.deepEqual(rangoDe(null, 3), { min: null, max: 3 })
  assert.deepEqual(rangoDe(90, null), { min: 90, max: null })
  assert.equal(fueraDeRango(999, rangoDe(null, null)), false)
})
