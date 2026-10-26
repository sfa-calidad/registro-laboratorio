import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// El `matcher` del proxy decide qué rutas pasan por el control de sesión. Es
// una lista literal porque Next la lee en el build (no puede venir de una
// constante importada), así que el test la saca del propio archivo: lo que se
// verifica es el texto que termina desplegado, no una copia.

function matcherDelProxy(): RegExp {
  const fuente = readFileSync(join(process.cwd(), 'src/proxy.ts'), 'utf8')
  const encontrado = /matcher:\s*\[\s*'([^']+)'/.exec(fuente)
  assert.ok(encontrado, 'src/proxy.ts tiene que exportar config.matcher')
  return new RegExp(`^${encontrado[1]}$`)
}

function pasaPorElProxy(ruta: string): boolean {
  return matcherDelProxy().test(ruta)
}

test('toda pantalla y toda API pasan por el control de sesión', () => {
  for (const ruta of ['/', '/ingresos', '/muestras/nueva', '/insumos/faltantes', '/api/ingresos']) {
    assert.ok(pasaPorElProxy(ruta), `${ruta} tendría que pasar por el proxy`)
  }
})

test('el optimizador de imágenes también pide sesión', () => {
  // `/_next/image` es el endpoint del optimizador: recibe una ruta por query y
  // la decodifica con sharp. Ahí aparecieron las RCE sin autenticación de
  // Next 16 (AVIF y SVG). Esta app no usa `next/image` en ninguna pantalla —
  // el logo de los informes va embebido—, así que el endpoint no tiene por qué
  // estar abierto: dejarlo fuera del matcher es regalar superficie de ataque
  // por una función que no se usa.
  assert.ok(pasaPorElProxy('/_next/image'), 'el optimizador no puede quedar sin sesión')
  assert.ok(pasaPorElProxy('/_next/image/'), 'tampoco con barra al final')
})

test('los archivos del build siguen saliendo sin sesión', () => {
  // Si el JS y el CSS de la página pidieran cookie, el login no podría ni
  // dibujarse.
  for (const ruta of ['/_next/static/chunks/main.js', '/_next/static/css/app.css', '/favicon.ico']) {
    assert.ok(!pasaPorElProxy(ruta), `${ruta} tiene que servirse sin pasar por el proxy`)
  }
})
