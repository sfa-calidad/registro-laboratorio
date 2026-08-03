// Cuentas del laboratorio que antes se hacían en el Excel. Son funciones puras
// y tienen tests contra los números de la propia planilla.

// ------------------------------------------------------- fuera de spec

export type Rango = { min: number | null; max: number | null }

// La regla vivía solo en el componente de análisis de tanque. Está acá para que
// la use también el servidor y no haya dos versiones que se desincronicen.
export function fueraDeRango(valor: number | null, rango: Rango | undefined): boolean {
  if (valor === null || !rango) return false
  return (rango.min !== null && valor < rango.min) || (rango.max !== null && valor > rango.max)
}

// Texto del desvío para el cartel del informe: "Acidez 5,40 % — máximo 3,00 %".
// Cómo se escribe una especificación en el informe y en los formularios. Vive
// acá porque la usan el análisis de tanque y el de materia prima: cuando cada
// uno tenía la suya, la de tanques imprimía "— a 3" para un límite que solo
// tiene máximo.
export function textoSpec(rango: Rango | undefined, decimales = 2): string {
  if (!rango) return '—'
  const n = (v: number) => v.toFixed(decimales).replace('.', ',')
  if (rango.min !== null && rango.max !== null) return `${n(rango.min)} a ${n(rango.max)}`
  if (rango.max !== null) return `máx. ${n(rango.max)}`
  if (rango.min !== null) return `mín. ${n(rango.min)}`
  return '—'
}

// Un rango solo cuenta si tiene al menos un extremo cargado: dos casillas
// vacías no son "un rango sin límites", son la ausencia de especificación.
export function rangoDe(min: number | null, max: number | null): Rango | undefined {
  return min === null && max === null ? undefined : { min, max }
}

export function textoDesvio(
  etiqueta: string,
  valor: number,
  rango: Rango,
  unidad: string | null,
  decimales = 2
): string {
  const n = (v: number) => v.toFixed(decimales).replace('.', ',')
  const u = unidad ? ` ${unidad}` : ''
  const limite =
    rango.max !== null && valor > rango.max
      ? `máximo ${n(rango.max)}${u}`
      : `mínimo ${n(rango.min!)}${u}`
  return `${etiqueta}: ${n(valor)}${u} — ${limite}`
}

// ------------------------------------------------------- materia grasa

// En la planilla la materia grasa no se mide: se calcula como
// "100 - I(mayor) - humedad", donde I(mayor) es el mayor de los insolubles
// (hexano o acetona) y la humedad es la que se haya reportado. Verificado
// contra los siete bloques del Excel que tienen insolubles cargados.
//
// Devuelve null cuando falta alguno de los dos datos: un cero sería mentira.
export function materiaGrasa(humedad: number | null, insolubles: (number | null)[]): number | null {
  const validos = insolubles.filter((v): v is number => v !== null && Number.isFinite(v))
  if (humedad === null || !Number.isFinite(humedad) || validos.length === 0) return null
  return redondear(100 - Math.max(...validos) - humedad, 2)
}

// ------------------------------------------------------- borras

// Corte rápido con sulfúrico: se leen los mililitros del tubo después de
// centrifugar. La base húmeda toma el volumen total; la base seca descuenta el
// agua, que es como se informa cuando lo que importa es la grasa sobre el
// sólido.
export type CorteRapido = { baseHumeda: number | null; baseSeca: number | null }

export function corteRapido(aceiteMl: number, sedimentoMl: number, aguaMl: number): CorteRapido {
  const total = aceiteMl + sedimentoMl + aguaMl
  const sinAgua = aceiteMl + sedimentoMl
  return {
    baseHumeda: total > 0 ? redondear((aceiteMl / total) * 100, 1) : null,
    baseSeca: sinAgua > 0 ? redondear((aceiteMl / sinAgua) * 100, 1) : null,
  }
}

// Preparación del sulfúrico: para el volumen que se va a usar, cuánta agua
// bidestilada y cuánto ácido hay que pesar.
export function prepararSulfurico(volumenMl: number, porcentaje: number) {
  return {
    aguaBidestilada: redondear(volumenMl * 0.1, 2),
    sulfurico: redondear((porcentaje / 100) * volumenMl, 2),
  }
}

// Análisis de goma, gravimétrico: se pesa el falcón antes y después.
export function porGravimetria(pesoMuestra: number, pesoInicial: number, pesoFinal: number): number | null {
  if (!(pesoMuestra > 0)) return null
  return redondear(((pesoFinal - pesoInicial) / pesoMuestra) * 100, 2)
}

// ------------------------------------------------------- utilidades

function redondear(n: number, decimales: number): number {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

// Acepta coma o punto decimal, como los formularios del laboratorio.
export function parseNumero(s: string): number | null {
  const limpio = s.trim().replace(',', '.')
  if (limpio === '' || !/^-?\d+(\.\d+)?$/.test(limpio)) return null
  return Number(limpio)
}
