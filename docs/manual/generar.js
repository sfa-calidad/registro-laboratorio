/**
 * Arma el PDF del manual a partir de docs/manual/manual.html.
 *
 *   node docs/manual/generar.js [carpeta-de-capturas] [salida.pdf]
 *
 * Por defecto toma las capturas de "<Escritorio>/capturas-manual" y deja el PDF
 * en el escritorio.
 *
 * Las imágenes se incrustan dentro del HTML como data URI: el PDF queda de una
 * sola pieza y el HTML intermedio se puede abrir en cualquier lado sin arrastrar
 * una carpeta de PNG al lado.
 *
 * Las figuras cuya captura no exista se eliminan, así el manual se puede armar
 * con las que haya y la sección queda solo con el texto en vez de con un hueco.
 *
 * No agrega dependencias: usa el Edge que ya está instalado en la PC para
 * convertir a PDF (`--headless --print-to-pdf`).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const RAIZ = path.join(__dirname, '..', '..')
const FUENTE = path.join(__dirname, 'manual.html')
const capturasDir = process.argv[2] || path.join(os.homedir(), 'Desktop', 'capturas-manual')
const salidaPdf = process.argv[3] || path.join(os.homedir(), 'Desktop', 'Manual Laboratorio SFA.pdf')

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

function navegador() {
  const encontrado = NAVEGADORES.find((p) => fs.existsSync(p))
  if (!encontrado) {
    console.error('No se encontró Edge ni Chrome para generar el PDF.')
    console.error('Alternativa: abrí el HTML en el navegador y usá Ctrl+P → Guardar como PDF.')
    process.exit(1)
  }
  return encontrado
}

// Se busca por el nombre sin extensión y sin distinguir mayúsculas: la
// Herramienta de Recortes de Windows guarda como ".PNG", y quien saca las
// capturas no tiene por qué pelearse con eso.
const enCarpeta = fs.existsSync(capturasDir) ? fs.readdirSync(capturasDir) : []

function buscarCaptura(pedido) {
  const base = path.basename(pedido, path.extname(pedido)).toLowerCase()
  return (
    enCarpeta.find((f) => {
      const ext = path.extname(f).toLowerCase()
      return TIPOS[ext] && path.basename(f, path.extname(f)).toLowerCase() === base
    }) || null
  )
}

function main() {
  if (enCarpeta.length === 0) {
    console.log(`Aviso: no hay capturas en ${capturasDir}`)
    console.log('El manual se genera igual, solo con el texto.\n')
  }
  let html = fs.readFileSync(FUENTE, 'utf8')

  const puestas = []
  const faltantes = []

  // <figure data-captura="04-ingresos.png"> … </figure>
  html = html.replace(
    /<figure data-captura="([^"]+)">([\s\S]*?)<\/figure>/g,
    (completo, archivo, cuerpo) => {
      const real = buscarCaptura(archivo)
      if (!real) {
        faltantes.push(archivo)
        return ''
      }
      const tipo = TIPOS[path.extname(real).toLowerCase()]
      puestas.push(real)
      const datos = fs.readFileSync(path.join(capturasDir, real)).toString('base64')
      const img = `<img src="data:${tipo};base64,${datos}" alt="${archivo}">`
      return `<figure>${img}${cuerpo}</figure>`
    },
  )

  const htmlArmado = path.join(RAIZ, 'docs', 'manual', '.manual-armado.html')
  fs.writeFileSync(htmlArmado, html, 'utf8')

  console.log(`Capturas incluidas: ${puestas.length}`)
  if (faltantes.length) {
    console.log(`Sin captura (esas figuras se omiten): ${faltantes.length}`)
    for (const f of faltantes) console.log(`  - ${f}`)
  }

  const exe = navegador()
  execFileSync(
    exe,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${salidaPdf}`,
      'file:///' + htmlArmado.replace(/\\/g, '/'),
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )

  fs.unlinkSync(htmlArmado)

  const kb = Math.round(fs.statSync(salidaPdf).size / 1024)
  console.log(`\nPDF generado: ${salidaPdf} (${kb} KB)`)
}

main()
