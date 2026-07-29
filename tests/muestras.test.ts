import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivarEstado } from '@/lib/muestras'

// Con laboratorio interno la API guarda protocolo = número de muestra. Ese
// protocolo autogenerado no puede contar como "hay resultado": si contaba,
// abrir la muestra para corregir una observación la movía sola a
// CON_RESULTADO y desaparecía del seguimiento de pendientes.

test('una muestra recién identificada, sin laboratorio', () => {
  assert.equal(derivarEstado({ numero: '26301', labEsExterno: null }), 'IDENTIFICADA')
})

test('laboratorio interno: alta y reedición se mantienen EN_ANALISIS', () => {
  const base = { numero: '26301', labEsExterno: false as boolean | null }
  assert.equal(derivarEstado({ ...base }), 'EN_ANALISIS')
  // La reedición reenvía el protocolo que la API se autocompletó.
  assert.equal(derivarEstado({ ...base, protocolo: '26301' }), 'EN_ANALISIS')
  // Con espacios de más también, que es lo que llega desde el formulario.
  assert.equal(derivarEstado({ ...base, protocolo: ' 26301 ' }), 'EN_ANALISIS')
})

test('laboratorio interno: un protocolo escrito a mano sí es un resultado', () => {
  const base = { numero: '26301', labEsExterno: false as boolean | null }
  assert.equal(derivarEstado({ ...base, protocolo: 'PROT-8891' }), 'CON_RESULTADO')
  assert.equal(derivarEstado({ ...base, resultado: 'Conforme' }), 'CON_RESULTADO')
  assert.equal(derivarEstado({ ...base, fechaResultado: '2026-07-29' }), 'CON_RESULTADO')
})

test('laboratorio externo: el protocolo siempre lo carga una persona', () => {
  // Que coincida con el número es casualidad, no autogeneración.
  assert.equal(
    derivarEstado({ numero: '26301', labEsExterno: true, protocolo: '26301' }),
    'CON_RESULTADO'
  )
})

test('laboratorio externo con fecha de envío queda ENVIADA', () => {
  assert.equal(
    derivarEstado({ numero: '26301', labEsExterno: true, fechaEnvio: '2026-07-28' }),
    'ENVIADA'
  )
})

test('una fecha de envío sin laboratorio externo no alcanza para ENVIADA', () => {
  assert.equal(
    derivarEstado({ numero: '26301', labEsExterno: null, fechaEnvio: '2026-07-28' }),
    'IDENTIFICADA'
  )
})

// La numeración se prueba acá en su parte pura: el filtro de formato. El resto
// de proximoNumero necesita la base y se cubre con las pruebas de integración.
test('el filtro de la serie acepta exactamente 3 dígitos', () => {
  const filtro = (prefijo: string, n: string) => new RegExp(`^${prefijo}\\d{3}$`).test(n)
  assert.equal(filtro('26', '26300'), true)
  assert.equal(filtro('26', '26301'), true)
  // Un "263000" mal tipeado se leía como secuencia 3000 y hacía saltar la serie
  // unos 2700 números; el número es la etiqueta física del frasco.
  assert.equal(filtro('26', '263000'), false)
  assert.equal(filtro('26', '26ABC'), false)
  assert.equal(filtro('26', '2630'), false)
})
