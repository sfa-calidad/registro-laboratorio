/**
 * Importación histórica de las planillas Excel a la base.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/importar-planillas.ts \
 *     --tanques planilla-digital.xlsx --muestras listado-muestras.xlsx
 *
 * Se puede pasar solo una de las dos. Es idempotente: las muestras se
 * upsertean por número, y los análisis de tanque se saltean si ya existe uno
 * idéntico (misma fecha, producto, tanques y altura). Termina imprimiendo un
 * resumen con importados, salteados y filas con problemas.
 *
 * Convención de valores: el número se guarda TAL CUAL está en la planilla
 * (0,0157 y no 1,57): el formato de presentación lo pone la unidad del
 * parámetro. No se convierte a porcentaje al importar.
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as zlib from 'zlib'

const prisma = new PrismaClient()

// --- Mapas de normalización (ajustar acá si aparecen variantes nuevas) ------

export const NORMALIZACION_PRODUCTOS: Record<string, string> = {
  'oleina': 'Oleína',
  'oliena': 'Oleína',
  'oleína': 'Oleína',
  'uco': 'UCO',
  'aceite': 'Aceite',
  'acido graso': 'Ácido graso',
  'ácido graso': 'Ácido graso',
  'acidos grasos': 'Ácido graso',
  'ácidos grasos': 'Ácido graso',
  'borra': 'Borra',
  'borra neutra': 'Borra Neutra',
  'bn gmp+': 'BN GMP+',
  'residuo organico': 'Residuo Orgánico',
  'residuo orgánico': 'Residuo Orgánico',
  'ro': 'RO',
  'aceite animal': 'Aceite Animal',
}

export function normalizarProducto(raw: string): string {
  const clave = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  return NORMALIZACION_PRODUCTOS[clave] || raw.trim()
}

// La columna de cliente del listado viejo mezcla códigos de motivo (hoja
// auxiliar, PV/MOS/CO/MT) con el nombre del cliente: "PV Fulano". La app no
// guarda el motivo como campo propio, pero el código igual se separa del
// nombre para no importar "PV Fulano" como si fuera la razón social.
const CODIGO_MOTIVO_PREFIJO = /^(PV|MOS|CO|MT)\b[\s:-]*/i

// --- Parser de alturas -------------------------------------------------------
// El texto libre de la planilla ("Conj Gral 0,5m AF HA", "val 2AF", "2m DS")
// se descompone en punto + alturaM + referencia + conjuntoHaciaArriba. El
// punto (Válvula, Conjunto general, etc.) se usa solo como paso intermedio
// para separar correctamente el resto de la altura del texto — la app ya no
// tiene un campo propio para guardarlo, así que no se persiste.
// Si algo no matchea, ok=false y el texto original va a comentario con el
// prefijo [altura sin parsear] en vez de perderse.

export type AlturaParseada = {
  punto: string | null
  alturaM: number | null
  referencia: string | null
  conjuntoHaciaArriba: boolean
  ok: boolean
}

const PUNTOS_PREFIJO: [RegExp, string][] = [
  [/^VAL(V(ULA)?)?\.?\b/, 'Válvula'],
  [/^CONJ(UNTO)?\.?( GRAL\.?| GENERAL)?\b/, 'Conjunto general'],
  [/^PURGA( DE)? FONDO\b/, 'Purga de fondo'],
  [/^RECIRCULADO\b/, 'Recirculado'],
  [/^SUPERFICIE\b/, 'Superficie'],
  [/^FONDO\b/, 'Fondo'],
]

export function parseAltura(raw: string): AlturaParseada {
  const resultado: AlturaParseada = { punto: null, alturaM: null, referencia: null, conjuntoHaciaArriba: false, ok: true }
  let s = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!s) return resultado

  for (const [re, punto] of PUNTOS_PREFIJO) {
    if (re.test(s)) {
      resultado.punto = punto
      s = s.replace(re, '').trim()
      break
    }
  }

  // El resto son tokens: número(+unidad)(+referencia)(+HA), referencia suelta,
  // HA suelto o pegado a la referencia ("AFHA"), y separadores tipo " - ".
  const tokens = s.split(/[\s\-·,;]+/).filter((t) => t && t !== '-')
  for (const t of tokens) {
    // "0,5M", "2MTS", "2AF", "2M", "2", "2,9MDS" (número con todo pegado)
    const compuesto = t.match(/^(\d+(?:[.,]\d+)?)(?:M(?:TS?)?)?(AF|DS|AC)?(HA)?$/)
    if (compuesto) {
      resultado.alturaM = Number(compuesto[1].replace(',', '.'))
      if (compuesto[2]) resultado.referencia = compuesto[2]
      if (compuesto[3]) resultado.conjuntoHaciaArriba = true
      continue
    }
    // "AF", "DS", "AC", "AFHA", "DSHA", "ACHA"
    const ref = t.match(/^(AF|DS|AC)(HA)?$/)
    if (ref) {
      resultado.referencia = ref[1]
      if (ref[2]) resultado.conjuntoHaciaArriba = true
      continue
    }
    if (t === 'HA') {
      resultado.conjuntoHaciaArriba = true
      continue
    }
    // Unidad suelta ("2 m", "2 mts"): el número ya se tomó en el token anterior.
    if (/^M(TS?)?$/.test(t) && resultado.alturaM !== null) continue
    // Token desconocido: mejor no adivinar.
    resultado.ok = false
  }

  // Nota: la coma decimal ("0,5m") ya viene cubierta porque el split por comas
  // solo corta cuando la coma no está entre dígitos... no: el split de arriba
  // corta "0,5M" en "0" y "5M". Se protege antes del split.
  return resultado
}

// El split por comas rompería la coma decimal; se normaliza antes.
export function parseAlturaSeguro(raw: string): AlturaParseada {
  const protegido = raw.replace(/(\d),(\d)/g, '$1.$2')
  const r = parseAltura(protegido)
  // HA implica compuesto aunque no diga "Conj": si no hubo punto explícito,
  // el conjunto hacia arriba es un Conjunto general.
  if (r.conjuntoHaciaArriba && !r.punto) r.punto = 'Conjunto general'
  return r
}

// --- Lector XLSX mínimo ------------------------------------------------------
// Un .xlsx es un ZIP con XML adentro. Para no sumar dependencias, se lee el
// directorio central del ZIP a mano y se parsea el XML con expresiones
// regulares (alcanza para planillas simples de celdas de texto/número).

function leerZip(path: string): Map<string, Buffer> {
  const buf = fs.readFileSync(path)
  const archivos = new Map<string, Buffer>()
  // End of Central Directory: firma 0x06054b50, búsqueda desde el final.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error(`${path}: no parece un .xlsx (sin directorio ZIP)`)
  const cantidad = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  for (let n = 0; n < cantidad; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break
    const compresion = buf.readUInt16LE(off + 10)
    const tamComp = buf.readUInt32LE(off + 20)
    const largoNombre = buf.readUInt16LE(off + 28)
    const largoExtra = buf.readUInt16LE(off + 30)
    const largoComentario = buf.readUInt16LE(off + 32)
    const offsetLocal = buf.readUInt32LE(off + 42)
    const nombre = buf.toString('utf8', off + 46, off + 46 + largoNombre)
    // Local header: saltar nombre y extra locales (pueden diferir del central).
    const lhNombre = buf.readUInt16LE(offsetLocal + 26)
    const lhExtra = buf.readUInt16LE(offsetLocal + 28)
    const inicioDatos = offsetLocal + 30 + lhNombre + lhExtra
    const datos = buf.subarray(inicioDatos, inicioDatos + tamComp)
    archivos.set(nombre, compresion === 8 ? zlib.inflateRawSync(datos) : Buffer.from(datos))
    off += 46 + largoNombre + largoExtra + largoComentario
  }
  return archivos
}

function desescaparXml(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
}

type Hoja = { nombre: string; filas: string[][] }

export function leerXlsx(path: string): Hoja[] {
  const zip = leerZip(path)
  const shared: string[] = []
  const ss = zip.get('xl/sharedStrings.xml')
  if (ss) {
    // Cada <si> puede tener varios <t> (texto con formato partido).
    for (const si of ss.toString('utf8').match(/<si>[\s\S]*?<\/si>/g) || []) {
      const textos = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => desescaparXml(m[1]))
      shared.push(textos.join(''))
    }
  }
  // Nombres y orden de hojas desde workbook.xml + su relación con los archivos.
  const wb = zip.get('xl/workbook.xml')?.toString('utf8') || ''
  const rels = zip.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || ''
  const relMap = new Map<string, string>()
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) relMap.set(m[1], m[2].replace(/^\//, ''))
  const hojas: Hoja[] = []
  for (const m of wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = relMap.get(m[2])
    if (!target) continue
    const xml = zip.get(target.startsWith('xl/') ? target : `xl/${target}`)?.toString('utf8')
    if (!xml) continue
    const filas: string[][] = []
    for (const fila of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []) {
      const celdas: string[] = []
      for (const c of fila.matchAll(/<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]
        const cuerpo = c[2] || ''
        const refCol = attrs.match(/r="([A-Z]+)\d+"/)
        // Respetar la posición real de la columna (celdas vacías se omiten en el XML).
        let col = celdas.length
        if (refCol) {
          col = 0
          for (const ch of refCol[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
          col -= 1
        }
        let valor = ''
        const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)
        const inline = cuerpo.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/)
        if (/t="s"/.test(attrs) && v) valor = shared[Number(v[1])] ?? ''
        else if (inline) valor = desescaparXml(inline[1])
        else if (v) valor = desescaparXml(v[1])
        while (celdas.length < col) celdas.push('')
        celdas[col] = valor.trim()
      }
      filas.push(celdas)
    }
    hojas.push({ nombre: m[1], filas })
  }
  return hojas
}

// Fechas Excel: serial de días desde 1899-12-30. Se aceptan también textos
// dd/mm/aaaa. Devuelve medianoche UTC (convención de fechas-calendario).
export function parseFechaExcel(v: string): Date | null {
  if (!v) return null
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = Number(v)
    if (serial > 20000 && serial < 60000) {
      return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000)
    }
  }
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const anio = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])
    return new Date(Date.UTC(anio, Number(m[2]) - 1, Number(m[1])))
  }
  return null
}

function normalizarEncabezado(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// --- Importación de tanques --------------------------------------------------
// Encabezados esperados de la hoja "Tanques" (ajustar si difieren).
const COLS_TANQUES = {
  fecha: ['fecha'],
  producto: ['producto'],
  tanques: ['tanque', 'tanques', 'tk'],
  altura: ['altura', 'punto', 'punto de extraccion', 'altura punto'],
  analista: ['analista', 'operador'],
  comentario: ['comentario', 'observacion', 'observaciones'],
}

function buscarCol(encabezados: string[], candidatos: string[]): number {
  return encabezados.findIndex((h) => candidatos.includes(h))
}

async function importarTanques(path: string) {
  const hojas = leerXlsx(path)
  const hoja = hojas.find((h) => normalizarEncabezado(h.nombre) === 'tanques') || hojas[0]
  console.log(`\nImportando análisis de tanques desde "${hoja.nombre}" (${hoja.filas.length - 1} filas)`)

  const encabezados = (hoja.filas[0] || []).map(normalizarEncabezado)
  const col = {
    fecha: buscarCol(encabezados, COLS_TANQUES.fecha),
    producto: buscarCol(encabezados, COLS_TANQUES.producto),
    tanques: buscarCol(encabezados, COLS_TANQUES.tanques),
    altura: buscarCol(encabezados, COLS_TANQUES.altura),
    analista: buscarCol(encabezados, COLS_TANQUES.analista),
    comentario: buscarCol(encabezados, COLS_TANQUES.comentario),
  }
  if (col.fecha < 0 || col.producto < 0 || col.tanques < 0) {
    console.error('  No se encontraron las columnas fecha/producto/tanques. Encabezados vistos:', encabezados.join(' | '))
    return { importados: 0, salteados: 0, problemas: [`Encabezados no reconocidos en ${path}`] }
  }

  // Las columnas restantes se intentan matchear contra el catálogo de
  // parámetros por abreviatura o nombre (sin acentos ni mayúsculas).
  const parametros = await prisma.parametro.findMany()
  const colParametros: { idx: number; parametroId: number }[] = []
  encabezados.forEach((h, idx) => {
    if (Object.values(col).includes(idx) || !h) return
    const p = parametros.find((p) =>
      normalizarEncabezado(p.abreviatura || '') === h ||
      normalizarEncabezado(p.nombre) === h ||
      (p.metodo && normalizarEncabezado(`${p.nombre} ${p.metodo}`) === h)
    )
    if (p) colParametros.push({ idx, parametroId: p.id })
  })
  console.log(`  Columnas de parámetros reconocidas: ${colParametros.length}`)

  let importados = 0
  let salteados = 0
  const problemas: string[] = []

  for (let i = 1; i < hoja.filas.length; i++) {
    const fila = hoja.filas[i]
    if (!fila || fila.every((c) => !c)) continue
    const fecha = parseFechaExcel(fila[col.fecha] || '')
    const producto = normalizarProducto(fila[col.producto] || '')
    const tanques = (fila[col.tanques] || '').trim()
    if (!fecha || !producto || !tanques) {
      problemas.push(`Fila ${i + 1}: falta fecha, producto o tanque`)
      continue
    }

    const alturaRaw = col.altura >= 0 ? (fila[col.altura] || '').trim() : ''
    const alt = parseAlturaSeguro(alturaRaw)
    let comentario = col.comentario >= 0 ? (fila[col.comentario] || '').trim() : ''
    if (alturaRaw && !alt.ok) {
      comentario = [`[altura sin parsear] ${alturaRaw}`, comentario].filter(Boolean).join(' · ')
      problemas.push(`Fila ${i + 1}: altura sin parsear "${alturaRaw}"`)
    }

    // Idempotencia: mismo día + producto + tanques + altura = mismo análisis.
    // La app ya no guarda el punto de extracción como campo propio (se sacó
    // del modelo); si la altura no matcheó, se compara igual por null para
    // no reimportar la misma fila sin parsear en cada corrida.
    const existente = await prisma.analisisTanque.findFirst({
      where: {
        fecha, producto, tanques,
        alturaM: alt.ok ? alt.alturaM : null,
        referencia: alt.ok ? alt.referencia : null,
      },
    })
    if (existente) { salteados++; continue }

    const resultados = colParametros
      .map(({ idx, parametroId }) => {
        const v = (fila[idx] || '').trim()
        if (!v) return null
        const n = Number(v.replace(',', '.'))
        return Number.isFinite(n) ? { parametroId, valor: n } : { parametroId, valorTexto: v }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    await prisma.analisisTanque.create({
      data: {
        fecha, producto, tanques,
        alturaM: alt.ok ? alt.alturaM : null,
        referencia: alt.ok ? alt.referencia : null,
        conjuntoHaciaArriba: alt.ok ? alt.conjuntoHaciaArriba : false,
        analista: col.analista >= 0 ? (fila[col.analista] || '').trim() || null : null,
        comentario: comentario || null,
        resultados: { create: resultados },
      },
    })
    importados++
  }
  return { importados, salteados, problemas }
}

// --- Importación de muestras ---------------------------------------------------
// Hojas por año del listado (2025 y 2026; las viejas tienen otras columnas y
// quedan para después). Encabezados esperados (ajustar si difieren).
const COLS_MUESTRAS = {
  numero: ['numero', 'n', 'nro', 'n muestra', 'numero de muestra', 'muestra'],
  fecha: ['fecha'],
  producto: ['producto'],
  detalle: ['detalle', 'descripcion'],
  cliente: ['cliente', 'cliente proveedor', 'contacto'],
  origen: ['origen', 'identificacion', 'tanque camion'],
  lugar: ['lugar', 'lugar de muestreo', 'planta'],
  laboratorio: ['laboratorio', 'lab'],
  fechaEnvio: ['fecha envio', 'envio', 'enviada'],
  awb: ['awb'],
  protocolo: ['protocolo'],
  fechaResultado: ['fecha resultado'],
  resultado: ['resultado'],
  ensayos: ['ensayos', 'analisis', 'analisis solicitados'],
  observacion: ['observacion', 'observaciones', 'obs'],
}

async function importarMuestras(path: string) {
  const hojas = leerXlsx(path)
  const porAnio = hojas.filter((h) => ['2025', '2026'].includes(h.nombre.trim()))
  if (porAnio.length === 0) {
    console.error(`\nNo se encontraron hojas "2025" ni "2026" en ${path}. Hojas: ${hojas.map((h) => h.nombre).join(', ')}`)
    return { importados: 0, salteados: 0, problemas: [`Sin hojas de año en ${path}`] }
  }

  const labs = await prisma.laboratorio.findMany()
  let importados = 0
  let salteados = 0
  const problemas: string[] = []

  for (const hoja of porAnio) {
    console.log(`\nImportando muestras de la hoja "${hoja.nombre}" (${hoja.filas.length - 1} filas)`)
    const encabezados = (hoja.filas[0] || []).map(normalizarEncabezado)
    const col: Record<string, number> = {}
    for (const [k, candidatos] of Object.entries(COLS_MUESTRAS)) col[k] = buscarCol(encabezados, candidatos)
    if (col.numero < 0 || col.fecha < 0 || col.producto < 0) {
      problemas.push(`Hoja ${hoja.nombre}: sin columnas numero/fecha/producto (vistas: ${encabezados.join(' | ')})`)
      continue
    }

    for (let i = 1; i < hoja.filas.length; i++) {
      const fila = hoja.filas[i]
      if (!fila || fila.every((c) => !c)) continue
      const numero = (fila[col.numero] || '').trim()
      const fecha = parseFechaExcel(fila[col.fecha] || '')
      const producto = normalizarProducto(fila[col.producto] || '')
      if (!numero || !fecha || !producto) {
        problemas.push(`Hoja ${hoja.nombre}, fila ${i + 1}: falta número, fecha o producto`)
        continue
      }

      // La columna de cliente puede traer el código de motivo adelante; se
      // descarta (la app no lo guarda) pero se limpia del nombre del contacto.
      let contacto = col.cliente >= 0 ? (fila[col.cliente] || '').trim() : ''
      const codigo = contacto.match(CODIGO_MOTIVO_PREFIJO)
      if (codigo) contacto = contacto.slice(codigo[0].length).trim()

      const laboratorio = col.laboratorio >= 0 ? (fila[col.laboratorio] || '').trim() || null : null
      const lab = laboratorio ? labs.find((l) => l.nombre.toLowerCase() === laboratorio.toLowerCase()) : null
      const protocolo = col.protocolo >= 0 ? (fila[col.protocolo] || '').trim() || null : null
      const resultado = col.resultado >= 0 ? (fila[col.resultado] || '').trim() || null : null
      const fechaEnvio = col.fechaEnvio >= 0 ? parseFechaExcel(fila[col.fechaEnvio] || '') : null
      const fechaResultado = col.fechaResultado >= 0 ? parseFechaExcel(fila[col.fechaResultado] || '') : null

      // Misma derivación de estado que la API.
      let estado = 'IDENTIFICADA'
      if (fechaResultado || resultado || protocolo) estado = 'CON_RESULTADO'
      else if (fechaEnvio && lab?.esExterno) estado = 'ENVIADA'
      else if (lab && !lab.esExterno) estado = 'EN_ANALISIS'

      const datos = {
        fecha, producto,
        detalle: col.detalle >= 0 ? (fila[col.detalle] || '').trim() || null : null,
        identificacionOrigen: col.origen >= 0 ? (fila[col.origen] || '').trim() || null : null,
        lugarMuestreo: col.lugar >= 0 ? (fila[col.lugar] || '').trim() || null : null,
        contacto: contacto || null,
        laboratorio, estado, fechaEnvio,
        awb: col.awb >= 0 ? (fila[col.awb] || '').trim() || null : null,
        protocolo, fechaResultado, resultado,
        observacion: col.observacion >= 0 ? (fila[col.observacion] || '').trim() || null : null,
      }

      const existia = await prisma.muestra.findUnique({ where: { numero } })
      await prisma.muestra.upsert({ where: { numero }, update: datos, create: { numero, ...datos } })
      if (existia) salteados++
      else importados++

      // Ensayos como texto libre separado por coma/punto y coma (solo al crear,
      // para no duplicar en corridas repetidas).
      if (!existia && col.ensayos >= 0) {
        const texto = (fila[col.ensayos] || '').trim()
        if (texto) {
          const muestra = await prisma.muestra.findUnique({ where: { numero } })
          for (const e of texto.split(/[,;/]+/).map((x) => x.trim()).filter(Boolean)) {
            await prisma.muestraEnsayo.create({ data: { muestraId: muestra!.id, libre: e } })
          }
        }
      }
    }
  }
  return { importados, salteados, problemas }
}

// --- Main ---------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : null
  }
  const pathTanques = get('--tanques')
  const pathMuestras = get('--muestras')
  if (!pathTanques && !pathMuestras) {
    console.log('Uso: importar-planillas.ts [--tanques archivo.xlsx] [--muestras archivo.xlsx]')
    process.exit(1)
  }

  const resumen: { modulo: string; importados: number; salteados: number; problemas: string[] }[] = []
  if (pathTanques) resumen.push({ modulo: 'Tanques', ...(await importarTanques(pathTanques)) })
  if (pathMuestras) resumen.push({ modulo: 'Muestras', ...(await importarMuestras(pathMuestras)) })

  console.log('\n================ RESUMEN ================')
  for (const r of resumen) {
    console.log(`${r.modulo}: ${r.importados} importados, ${r.salteados} salteados, ${r.problemas.length} con problemas`)
    for (const p of r.problemas) console.log(`  ⚠ ${p}`)
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect())
}
