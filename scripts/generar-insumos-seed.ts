/**
 * Genera prisma/datos/insumos.ts a partir de las dos planillas de datos/.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generar-insumos-seed.ts
 *
 * Se corre a mano y el RESULTADO se commitea; no se parsea en cada deploy. Así
 * las decisiones de normalización (qué se leyó como presentación, qué nombre
 * quedó, qué ubicación se unificó) quedan a la vista en el diff y se pueden
 * revisar antes de que entren a la base.
 *
 * Reusa leerXlsx() de importar-planillas.ts, que lee el .xlsx abriendo el ZIP y
 * el XML a mano, sin dependencias.
 */
import * as fs from 'fs'
import * as path from 'path'
import { leerXlsx } from './importar-planillas'
import {
  normalizarUbicacion,
  parseCantidadPlanilla,
  parseNombreDePlanilla,
} from '../src/lib/inventario'

const RAIZ = path.join(__dirname, '..')
const PLANILLA_REACTIVOS = path.join(RAIZ, 'datos', 'Stock Reactivos Actual 30-07-2025.xlsx')
const PLANILLA_VIDRIO = path.join(RAIZ, 'datos', 'Stock Material de vidrio 21-08-2024.xlsx')
const SALIDA = path.join(RAIZ, 'prisma', 'datos', 'insumos.ts')

type InsumoSeed = {
  nombre: string
  categoria: 'REACTIVO' | 'VIDRIO'
  presentacion: string
  ubicacion: string | null
  stock: number
  seControla: boolean
  contenidoPorEnvase: number | null
  unidadContenido: string | null
  observacion: string | null
}

type SustanciaSeed = { nombre: string; gtin: string; unidad: 'L' | 'kg'; inferida: boolean }

// La hoja Sedronar deja la unidad en blanco en 10 de sus 14 filas. Las únicas
// que se pueden deducir sin riesgo son los sólidos; el resto son líquidos. Queda
// anotado cuáles se dedujeron, para poder revisarlas en Configuración.
const SOLIDOS_SIN_UNIDAD = /^(naoh|koh)\b/i

const avisos: string[] = []

// --- Insumos -----------------------------------------------------------------

function filasDeInventario(planilla: string, categoria: 'REACTIVO' | 'VIDRIO'): InsumoSeed[] {
  const hoja = leerXlsx(planilla)[0]
  const insumos: InsumoSeed[] = []

  // La fila 1 es el encabezado (Producto/ID | Tipo | Cantidad | Ubicacion | ...).
  for (const fila of hoja.filas.slice(1)) {
    const crudo = (fila[0] || '').trim()
    if (!crudo) continue

    const { nombre, presentacion, contenido, unidadContenido, nota } = parseNombreDePlanilla(crudo)
    const cantidad = parseCantidadPlanilla(fila[2] || '')
    const ubicacion = normalizarUbicacion(fila[3] || '')
    // Columna "Botella/Pote": dice si hay un envase empezado. No se sigue frasco
    // por frasco, así que el dato se conserva como observación en vez de
    // perderse.
    const abierto = (fila[4] || '').trim()

    const notas = [nota, cantidad.nota]
    if (abierto) notas.push(`${abierto} según la planilla`)
    if (/(^|- )puerta$/i.test(ubicacion)) {
      notas.push('Ubicación incompleta en la planilla: la puerta no tenía número')
    }

    insumos.push({
      nombre,
      categoria,
      presentacion,
      ubicacion: ubicacion || null,
      stock: cantidad.stock,
      seControla: cantidad.seControla,
      contenidoPorEnvase: contenido,
      unidadContenido,
      observacion: notas.filter(Boolean).join('. ') || null,
    })
  }
  return insumos
}

// --- Sustancias controladas (hoja Sedronar) ----------------------------------

function sustanciasControladas(): SustanciaSeed[] {
  const hojas = leerXlsx(PLANILLA_REACTIVOS)
  const hoja = hojas.find((h) => /sedronar/i.test(h.nombre))
  if (!hoja) {
    avisos.push('No se encontró la hoja "Sedronar" en la planilla de reactivos')
    return []
  }

  const sustancias: SustanciaSeed[] = []
  const gtinsVistos = new Set<string>()

  for (const fila of hoja.filas.slice(1)) {
    const nombre = (fila[0] || '').trim()
    const gtin = (fila[4] || '').trim()
    if (!nombre || !gtin) continue
    if (gtinsVistos.has(gtin)) {
      avisos.push(`GTIN repetido, se saltea: ${nombre} (${gtin})`)
      continue
    }
    gtinsVistos.add(gtin)

    const declarada = (fila[5] || '').trim().toUpperCase()
    let unidad: 'L' | 'kg'
    let inferida = false
    if (declarada === 'KILOS') unidad = 'kg'
    else if (declarada === 'LITROS') unidad = 'L'
    else {
      unidad = SOLIDOS_SIN_UNIDAD.test(nombre) ? 'kg' : 'L'
      inferida = true
    }

    sustancias.push({ nombre, gtin, unidad, inferida })
  }

  // Dos filas se llaman igual y son sustancias distintas (NaOH 50% en kilos y
  // NaOH 50% en litros, con GTIN distinto). El nombre lleva la unidad para que
  // se puedan distinguir en la lista, y porque el nombre es único en la base.
  const cuenta = new Map<string, number>()
  for (const s of sustancias) cuenta.set(s.nombre, (cuenta.get(s.nombre) ?? 0) + 1)
  for (const s of sustancias) {
    if ((cuenta.get(s.nombre) ?? 0) > 1) s.nombre = `${s.nombre} (${s.unidad})`
  }

  return sustancias
}

// Pistas para sugerir a qué insumo corresponde cada sustancia. NO se escriben en
// el seed: los nombres de las dos hojas no coinciden ("Acetico" vs "Acido
// Acetico (x 1lt)") y los números tampoco (Sedronar dice 6 de acético, la hoja
// de inventario dice 4). Un enlace adivinado terminaría en una declaración
// jurada, así que la sugerencia se imprime y la confirma una persona.
const PISTAS: Record<string, RegExp> = {
  'Acetico': /acido\s+acetico/i,
  'HCl 35-37': /clorhidrico\s+36/i,
  'HCl 37': /clorhidrico\s+37/i,
  'Eter': /^eter/i,
  // \b para no traer el Ciclohexano, que es otra cosa.
  'Hexano': /\bhexano/i,
  'KOH 85%': /hidroxido\s+de\s+potasio/i,
  'NaOH': /hidroxido\s+de\s+sodio\s*\(pro/i,
  'Metanol': /metanol/i,
  'Acetona': /acetona/i,
  'Cloroformo': /cloroformo/i,
  'Sulfurico': /acido\s+sulfurico/i,
  'NaOH 32%': /hidroxido\s+de\s+sodio\s+3/i,
  'NaOH 50%': /hidroxido\s+de\s+sodio\s+(30|50)/i,
}

function sinAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function sugerencias(sustancias: SustanciaSeed[], insumos: InsumoSeed[]): string[] {
  const lineas: string[] = []
  for (const s of sustancias) {
    const base = s.nombre.replace(/\s*\((L|kg)\)$/, '')
    const pista = PISTAS[base]
    const candidatos = pista ? insumos.filter((i) => pista.test(sinAcentos(i.nombre))) : []
    const detalle = candidatos.length
      ? candidatos.map((i) => `${i.nombre}${i.presentacion ? ` · ${i.presentacion}` : ''}`).join('  |  ')
      : '(sin candidato: enlazalo a mano)'
    lineas.push(`  ${s.nombre.padEnd(16)} ${s.gtin.padEnd(16)} ${s.unidad.padEnd(3)} -> ${detalle}`)
  }
  return lineas
}

// --- Escritura ---------------------------------------------------------------

function comparar(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
}

function main() {
  const reactivos = filasDeInventario(PLANILLA_REACTIVOS, 'REACTIVO')
  const vidrio = filasDeInventario(PLANILLA_VIDRIO, 'VIDRIO')

  // El único de la base es (nombre, presentacion): si la planilla repite uno hay
  // que verlo acá y no cuando reviente el seed.
  const insumos: InsumoSeed[] = []
  const clavesVistas = new Set<string>()
  for (const i of [...reactivos, ...vidrio]) {
    const clave = `${i.nombre.toLowerCase()}|${i.presentacion.toLowerCase()}`
    if (clavesVistas.has(clave)) {
      avisos.push(`Repetido en la planilla, se saltea: "${i.nombre}" ${i.presentacion}`)
      continue
    }
    clavesVistas.add(clave)
    insumos.push(i)
  }

  const ubicaciones = [...new Set(insumos.map((i) => i.ubicacion).filter((u): u is string => !!u))]
    .sort(comparar)

  const sustancias = sustanciasControladas()

  const cuerpo = `// GENERADO por scripts/generar-insumos-seed.ts — no editar a mano.
//
// Sale de las dos planillas de datos/: "Stock Reactivos Actual 30-07-2025.xlsx"
// y "Stock Material de vidrio 21-08-2024.xlsx". Es la foto con la que arranca el
// inventario; de ahí en adelante el stock lo mueven los movimientos y no este
// archivo (prisma/seed.ts solo lo carga si la tabla está vacía).

export type InsumoSeed = {
  nombre: string
  categoria: string
  presentacion: string
  ubicacion: string | null
  stock: number
  seControla: boolean
  contenidoPorEnvase: number | null
  unidadContenido: string | null
  observacion: string | null
}

export const UBICACIONES: string[] = ${JSON.stringify(ubicaciones, null, 2)}

// Sustancias controladas por RENPRE/SEDRONAR, de la hoja "Sedronar". El enlace
// con cada insumo NO se genera acá: se elige desde el formulario del insumo.
export const SUSTANCIAS: { nombre: string; gtin: string; unidad: string }[] = ${JSON.stringify(
    sustancias.map(({ nombre, gtin, unidad }) => ({ nombre, gtin, unidad })),
    null,
    2,
  )}

export const INSUMOS: InsumoSeed[] = ${JSON.stringify(insumos, null, 2)}
`

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true })
  fs.writeFileSync(SALIDA, cuerpo.replace(/\r?\n/g, '\r\n'), 'utf8')

  console.log(`Escrito ${path.relative(RAIZ, SALIDA)}`)
  console.log(`  ${reactivos.length} reactivos + ${vidrio.length} de vidrio = ${insumos.length} insumos`)
  console.log(`  ${ubicaciones.length} ubicaciones, ${sustancias.length} sustancias controladas`)

  const conPresentacion = insumos.filter((i) => i.presentacion).length
  const sinContar = insumos.filter((i) => !i.seControla).length
  console.log(`  ${conPresentacion} con tamaño de envase leído del nombre`)
  console.log(`  ${sinContar} sin contar (se piden a pañol o nunca se contaron)`)

  const inferidas = sustancias.filter((s) => s.inferida)
  if (inferidas.length) {
    console.log('\nSin unidad en la planilla, se asumió (revisar en Configuración):')
    for (const s of inferidas) console.log(`  ${s.nombre.padEnd(16)} -> ${s.unidad}`)
  }

  console.log('\nSugerencia de enlace sustancia -> insumo (confirmar a mano en la app):')
  for (const l of sugerencias(sustancias, insumos)) console.log(l)

  if (avisos.length) {
    console.log('\nAvisos:')
    for (const a of avisos) console.log(`  ${a}`)
  }
}

main()
