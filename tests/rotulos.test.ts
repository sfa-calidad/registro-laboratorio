import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelRows, buildLabelZPL } from '@/lib/zpl'
import { buildLabelHTML } from '@/lib/etiqueta'
import { escaparXml, logoSeguro } from '@/lib/texto'

const config = { etiquetaAncho: '100', etiquetaAlto: '45', etiquetaFuente: '9', empresa: 'SFA', logo: '' }

test('el rótulo de despacho lleva el producto', () => {
  const filas = labelRows('SALIDAS', {
    destino: 'ACEITERA GENERAL DEHEZA S.A.',
    producto: 'Aceite',
    hrContrato: 'HR-1',
    idTransporte: 'ABC 123',
    fecha: '28/07/2026',
  })
  assert.deepEqual(filas.find(([k]) => k === 'Producto'), ['Producto', 'Aceite'])
})

test('el rótulo de calado numera los analistas solo si hay dos', () => {
  const uno = labelRows('CALADO', { tanque: '26', producto: 'Bio', analista1: 'Sergio Yedro' })
  assert.ok(uno.some(([k, v]) => k === 'Analista' && v === 'Sergio Yedro'))

  const dos = labelRows('CALADO', { tanque: '26', producto: 'Bio', analista1: 'A', analista2: 'B' })
  assert.ok(dos.some(([k]) => k === 'Analista 1'))
  assert.ok(dos.some(([k]) => k === 'Analista 2'))
})

test('las filas vacías no se imprimen', () => {
  const filas = labelRows('CALADO', { tanque: '26', producto: 'Bio', altura: '', fecha: '' })
  assert.ok(filas.every(([, v]) => v !== ''))
})

test('el HTML del rótulo escapa los valores', () => {
  const html = buildLabelHTML('SALIDAS', { destino: 'Fulano & Cía <SA>' }, config)
  assert.ok(html.includes('Fulano &amp; Cía &lt;SA&gt;'), 'tiene que salir escapado y completo')
  assert.ok(!html.includes('<SA>'), 'no puede quedar como etiqueta HTML')

  const inyeccion = buildLabelHTML('SALIDAS', { destino: '<img src=x onerror="alert(1)">' }, config)
  assert.ok(!inyeccion.includes('onerror="alert'), 'no se puede inyectar HTML ejecutable')
})

test('las medidas fuera de rango caen en el valor por defecto', () => {
  // Se interpolan dentro del <style>: un texto ahí podía cerrar la etiqueta de
  // estilo, y un valor absurdo dejaba el rótulo ilegible.
  const roto = buildLabelHTML('SALIDAS', { destino: 'X' }, {
    ...config,
    etiquetaAncho: '1mm } </style><script>alert(1)</script><style> {',
  })
  assert.ok(!roto.includes('<script>'))
  assert.ok(roto.includes('100mm'), 'cae en el ancho por defecto')
})

test('logoSeguro solo deja pasar imágenes en data URI', () => {
  const valido = 'data:image/png;base64,iVBORw0KGgo='
  assert.equal(logoSeguro(valido), valido)
  assert.equal(logoSeguro('x" onerror="alert(1)'), '')
  assert.equal(logoSeguro('javascript:alert(1)'), '')
  assert.equal(logoSeguro('https://ejemplo.com/logo.png'), '')
  assert.equal(logoSeguro(null), '')
})

test('escaparXml cubre los cinco caracteres', () => {
  assert.equal(escaparXml(`& < > " '`), '&amp; &lt; &gt; &quot; &apos;')
})

test('el ZPL sale bien formado y sin medidas negativas', () => {
  const zpl = buildLabelZPL('SALIDAS', {
    destino: 'ACEITERA GENERAL DEHEZA S.A.',
    producto: 'Aceite',
    fecha: '28/07/2026',
  }, config)

  assert.ok(zpl.startsWith('^XA'))
  assert.ok(zpl.trim().endsWith('^XZ'))
  assert.ok(zpl.includes('ACEITERA GENERAL DEHEZA S.A.'), 'el destino largo entra completo')

  for (const linea of zpl.split('\n')) {
    const comandos = linea.match(/\^(GB|FB|FO|PW|LL)([-\d,]+)/g) || []
    for (const c of comandos) {
      assert.ok(!/-\d/.test(c), `parámetro negativo en el ZPL: ${linea}`)
    }
  }
})

test('un valor que no entra se achica en vez de cortarse', () => {
  const zpl = buildLabelZPL('SALIDAS', { destino: 'ACEITERA GENERAL DEHEZA S.A.', fecha: '1/1/2026' }, config)
  const filaDestino = zpl.split('\n').find((l) => l.includes('ACEITERA'))!
  const fuente = Number(filaDestino.match(/\^A0N,(\d+),/)![1])
  const ancho = Number(filaDestino.match(/\^FB(\d+),/)![1])
  assert.ok(fuente < 24, 'tiene que achicar la letra de esa fila')
  assert.ok(fuente >= 16, 'pero no por debajo del piso legible')
  assert.ok('ACEITERA GENERAL DEHEZA S.A.'.length * 0.6 * fuente <= ancho, 'y así entra')
})

test('los caracteres de control de ZPL no pasan a los datos', () => {
  const zpl = buildLabelZPL('SALIDAS', { destino: 'AB^XZ~CD' }, config)
  assert.ok(!zpl.includes('AB^XZ'), 'el ^ y el ~ se limpian')
  assert.equal((zpl.match(/\^XZ/g) || []).length, 1, 'sigue habiendo un solo fin de etiqueta')
})
