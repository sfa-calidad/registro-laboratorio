import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDateOnly, hoyEnLaboratorio, sumarDias } from '@/lib/utils'
import { getRole } from '@/lib/auth'
import {
  SIN_ASIGNAR,
  TRAMOS_ANTIGUEDAD,
  cobertura,
  contarPorNombre,
  diasDesde,
  diasEntre,
  estaDemorada,
  etiquetaSemana,
  inicioDeSemana,
  mediana,
  tiemposDeCierre,
  tramoAntiguedad,
  ultimasSemanas,
} from '@/lib/metricas'
import EstadisticasView, { type FilaAnalista } from '@/components/EstadisticasView'
import FlujoLaboratorio, { type SemanaFlujo, type TramoAtraso } from '@/components/FlujoLaboratorio'
import NotasTablero from '@/components/NotasTablero'

export const dynamic = 'force-dynamic'

const PERIODOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
  { dias: 365, label: '1 año' },
]
const PERIODO_POR_DEFECTO = 30
const SEMANAS_SERIE = 12

const ESTADOS_ABIERTOS = { notIn: ['CON_RESULTADO', 'ANULADA'] }

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const pedido = Number(Array.isArray(params.dias) ? params.dias[0] : params.dias)
  const dias = PERIODOS.some((p) => p.dias === pedido) ? pedido : PERIODO_POR_DEFECTO

  // "Hoy" es el día del laboratorio, no el del proceso: en Vercel el servidor
  // corre en UTC y a partir de las 21:00 hora argentina ya está en el día
  // siguiente, así que las tarjetas de "hoy" cambiaban a media tarde.
  const hoy = hoyEnLaboratorio()
  const manana = sumarDias(hoy, 1)
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))
  const inicioMesQueViene = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1))

  const role = await getRole()

  // Las tareas archivadas no cuentan como pendientes ni como vencidas: el
  // tablero ya las esconde, pero acá seguían sumando para siempre si se
  // archivaba una tarea que nunca se completó.
  const tareasActivas = { completadaAt: null, archivadaAt: null }

  const [ingresosHoy, despachosHoy, ultIngresos, ultDespachos, tareasPendientes, tareasVencidas, analisisMes, muestrasPendientes] =
    await Promise.all([
      // Con tope superior: sin él, cualquier registro con fecha futura contaba
      // como "hoy".
      prisma.ingreso.count({ where: { fecha: { gte: hoy, lt: manana } } }),
      prisma.despacho.count({ where: { fecha: { gte: hoy, lt: manana } } }),
      prisma.ingreso.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.despacho.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.tarea.count({ where: tareasActivas }),
      prisma.tarea.count({ where: { ...tareasActivas, fechaVencimiento: { lt: hoy } } }),
      // También con tope: un análisis con fecha del mes que viene no es de este mes.
      prisma.analisisTanque.count({ where: { fecha: { gte: inicioMes, lt: inicioMesQueViene } } }),
      prisma.muestra.count({ where: { estado: ESTADOS_ABIERTOS } }),
    ])

  const analitica = role === 'supervisor' ? await calcularAnalitica(hoy, dias) : null

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-dark mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Ingresos hoy" value={ingresosHoy} color="green" />
            <StatCard label="Despachos hoy" value={despachosHoy} color="mustard" />
            <StatCard label="Tareas pendientes" value={tareasPendientes} color="dark" />
            <StatCard label="Tareas vencidas" value={tareasVencidas} color="red" />
            <StatCard label="Análisis de tanque (mes)" value={analisisMes} color="green" />
            <StatCard label="Muestras sin resultado" value={muestrasPendientes} color="mustard" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UltimosMovimientos
              titulo="Últimos ingresos"
              encabezados={['HR/Remito', 'Origen', 'Producto', 'Fecha']}
              filas={ultIngresos.map((i) => [i.id, i.hrRemito, i.origen, i.producto1, formatDateOnly(i.fecha)])}
            />
            <UltimosMovimientos
              titulo="Últimos despachos"
              encabezados={['HR/Contrato', 'Destino', 'Producto', 'Fecha']}
              filas={ultDespachos.map((d) => [d.id, d.hrContrato, d.destino, d.producto, formatDateOnly(d.fecha)])}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <NotasTablero />
        </div>
      </div>

      {analitica && (
        <div className="mt-10 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-bold text-brand-dark">Análisis del laboratorio</h3>
            {/* Enlaces y no un selector de JavaScript: el período viaja en la
                URL y el servidor recalcula, así que no hace falta mandarle al
                navegador todas las filas para que filtre. */}
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              {PERIODOS.map((p) => (
                <Link
                  key={p.dias}
                  href={`/?dias=${p.dias}`}
                  className={`px-3 py-1.5 border-l first:border-l-0 border-gray-300 ${
                    p.dias === dias ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>

          <FlujoLaboratorio
            semanas={analitica.semanas}
            atrasos={analitica.atrasos}
            demoradas={analitica.demoradas}
            pendientes={analitica.pendientes}
            tiemposInterno={analitica.tiemposInterno}
            tiemposExterno={analitica.tiemposExterno}
            dias={dias}
          />

          <EstadisticasView filas={analitica.analistas} cobertura={analitica.cobertura} dias={dias} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- analítica

async function calcularAnalitica(hoy: Date, dias: number) {
  const desde = sumarDias(hoy, -dias)
  const semanas = ultimasSemanas(SEMANAS_SERIE)
  const desdeSerie = new Date(`${semanas[0]}T00:00:00.000Z`)
  // La ventana más ancha de las dos: una sola consulta de muestras alcanza
  // para la serie semanal y para los tiempos del período.
  const desdeMin = desde < desdeSerie ? desde : desdeSerie

  const [muestras, muestrasAbiertas, analisis, tareas, ingresos, despachos, analistas, laboratorios] = await Promise.all([
    prisma.muestra.findMany({
      where: { OR: [{ fecha: { gte: desdeMin } }, { fechaResultado: { gte: desdeMin } }] },
      select: { fecha: true, fechaResultado: true, estado: true, laboratorio: true, cargadoPor: true, createdAt: true },
    }),
    // El atraso se mide sobre TODO lo pendiente, sin importar la antigüedad:
    // una muestra de hace cuatro meses sin resultado es justamente la que hay
    // que ver.
    prisma.muestra.findMany({
      where: { estado: ESTADOS_ABIERTOS },
      select: { fecha: true, estado: true, protocolo: true, fechaEnvio: true },
    }),
    prisma.analisisTanque.findMany({
      where: { fecha: { gte: desdeMin } },
      select: { fecha: true, analista: true, createdAt: true },
    }),
    prisma.tarea.findMany({
      where: { createdAt: { gte: desde } },
      select: { createdAt: true, completadaAt: true, archivadaAt: true, analistaId1: true, analistaId2: true },
    }),
    prisma.ingreso.findMany({ where: { createdAt: { gte: desde } }, select: { operador: true } }),
    prisma.despacho.findMany({ where: { createdAt: { gte: desde } }, select: { operador: true } }),
    // Sin filtrar por activo: dar de baja a alguien no puede borrarle la
    // historia de los gráficos hacia atrás.
    prisma.analista.findMany({ orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    prisma.laboratorio.findMany({ select: { nombre: true, esExterno: true } }),
  ])

  // --- Ritmo: lo que entra contra lo que sale, por semana
  const vacio = () => Object.fromEntries(semanas.map((s) => [s, 0])) as Record<string, number>
  const identificadas = vacio()
  const resueltas = vacio()
  const analisisPorSemana = vacio()
  for (const m of muestras) {
    if (m.estado === 'ANULADA') continue
    const sIdent = inicioDeSemana(m.fecha)
    if (sIdent in identificadas) identificadas[sIdent]++
    if (m.fechaResultado) {
      const sRes = inicioDeSemana(m.fechaResultado)
      if (sRes in resueltas) resueltas[sRes]++
    }
  }
  for (const a of analisis) {
    const s = inicioDeSemana(a.fecha)
    if (s in analisisPorSemana) analisisPorSemana[s]++
  }
  const serie: SemanaFlujo[] = semanas.map((s) => ({
    semana: s,
    etiqueta: etiquetaSemana(s),
    identificadas: identificadas[s],
    resueltas: resueltas[s],
    analisis: analisisPorSemana[s],
  }))

  // --- Tiempos, separando laboratorio interno de externo
  const esExternoPorNombre = new Map(laboratorios.map((l) => [l.nombre.toLowerCase(), l.esExterno]))
  // Entran las cerradas cuyo cierre cae en el período y también las que están
  // cerradas sin fecha de resultado, si se tomaron dentro del período. Si se
  // filtrara solo por fechaResultado, esas últimas nunca llegarían al cálculo y
  // la cobertura daría siempre "N de N", que es justo lo que no queremos.
  const cerradasDelPeriodo = muestras.filter((m) =>
    m.estado === 'CON_RESULTADO' && (m.fechaResultado ? m.fechaResultado >= desde : m.fecha >= desde)
  )
  const externo = (m: { laboratorio: string | null }) =>
    m.laboratorio ? esExternoPorNombre.get(m.laboratorio.trim().toLowerCase()) === true : false
  const tiemposInterno = tiemposDeCierre(cerradasDelPeriodo.filter((m) => !externo(m)))
  const tiemposExterno = tiemposDeCierre(cerradasDelPeriodo.filter((m) => externo(m)))

  // --- Atrasos: lo pendiente por antigüedad
  const porTramo = Object.fromEntries(TRAMOS_ANTIGUEDAD.map((t) => [t.clave, 0])) as Record<string, number>
  for (const m of muestrasAbiertas) porTramo[tramoAntiguedad(Math.max(0, diasDesde(m.fecha)))]++
  const atrasos: TramoAtraso[] = TRAMOS_ANTIGUEDAD.map((t) => ({
    clave: t.clave,
    etiqueta: t.etiqueta,
    cantidad: porTramo[t.clave],
  }))
  const demoradas = muestrasAbiertas.filter((m) => estaDemorada(m)).length

  // --- Analistas: carga de trabajo y tiempos
  const nombrePorId = new Map(analistas.map((a) => [a.id, `${a.nombre} ${a.apellido}`]))
  const porAnalista = contarPorNombre(muestras.filter((m) => m.createdAt >= desde).map((m) => m.cargadoPor))
  const porAnalisis = contarPorNombre(analisis.filter((a) => a.createdAt >= desde).map((a) => a.analista))
  const porMovimiento = contarPorNombre([...ingresos, ...despachos].map((x) => x.operador))

  const completadasPorNombre = new Map<string, number>()
  const enCursoPorNombre = new Map<string, number>()
  const diasPorNombre = new Map<string, number[]>()
  for (const t of tareas) {
    // Una tarea con dos firmas suma a las dos personas: es carga de trabajo,
    // no cantidad de tareas. La columna se rotula como "asignaciones".
    const firmas = [t.analistaId1, t.analistaId2]
      .filter((id): id is number => id !== null)
      .map((id) => nombrePorId.get(id) ?? SIN_ASIGNAR)
    const destinatarios = firmas.length ? [...new Set(firmas)] : [SIN_ASIGNAR]
    for (const nombre of destinatarios) {
      if (t.completadaAt) {
        completadasPorNombre.set(nombre, (completadasPorNombre.get(nombre) ?? 0) + 1)
        const lista = diasPorNombre.get(nombre) ?? []
        lista.push(diasEntre(t.createdAt, t.completadaAt))
        diasPorNombre.set(nombre, lista)
      } else if (!t.archivadaAt) {
        enCursoPorNombre.set(nombre, (enCursoPorNombre.get(nombre) ?? 0) + 1)
      }
    }
  }

  const nombres = new Set<string>([
    ...analistas.filter((a) => a.activo).map((a) => `${a.nombre} ${a.apellido}`),
    ...completadasPorNombre.keys(),
    ...enCursoPorNombre.keys(),
    ...porAnalista.keys(),
    ...porAnalisis.keys(),
    ...porMovimiento.keys(),
  ])

  const filas: FilaAnalista[] = [...nombres]
    .map((nombre) => ({
      nombre,
      tareasCompletadas: completadasPorNombre.get(nombre) ?? 0,
      tareasEnCurso: enCursoPorNombre.get(nombre) ?? 0,
      medianaDiasTarea: mediana(diasPorNombre.get(nombre) ?? []),
      analisis: porAnalisis.get(nombre) ?? 0,
      muestras: porAnalista.get(nombre) ?? 0,
      movimientos: porMovimiento.get(nombre) ?? 0,
    }))
    .filter((f) => f.nombre !== SIN_ASIGNAR || f.tareasCompletadas + f.tareasEnCurso + f.analisis + f.muestras + f.movimientos > 0)
    .sort((a, b) => {
      // "Sin asignar" siempre al final, sea cual sea su volumen.
      if (a.nombre === SIN_ASIGNAR) return 1
      if (b.nombre === SIN_ASIGNAR) return -1
      const totalA = a.tareasCompletadas + a.analisis + a.muestras + a.movimientos
      const totalB = b.tareasCompletadas + b.analisis + b.muestras + b.movimientos
      return totalB - totalA || a.nombre.localeCompare(b.nombre)
    })

  // Cobertura de la atribución: sobre los tres orígenes que guardan el nombre
  // como texto y admiten vacío.
  const atribuibles = [
    ...muestras.filter((m) => m.createdAt >= desde).map((m) => m.cargadoPor),
    ...analisis.filter((a) => a.createdAt >= desde).map((a) => a.analista),
    ...[...ingresos, ...despachos].map((x) => x.operador),
  ]

  return {
    semanas: serie,
    atrasos,
    demoradas,
    pendientes: muestrasAbiertas.length,
    tiemposInterno,
    tiemposExterno,
    analistas: filas,
    cobertura: cobertura(atribuibles),
  }
}

// ---------------------------------------------------------------- presentación

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-brand-green-light border-brand-green text-brand-green-dark',
    mustard: 'bg-amber-50 border-brand-mustard text-brand-mustard-dark',
    dark: 'bg-slate-50 border-slate-300 text-brand-dark',
    red: 'bg-red-50 border-brand-red text-brand-red-dark',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function UltimosMovimientos({
  titulo,
  encabezados,
  filas,
}: {
  titulo: string
  encabezados: string[]
  filas: (string | number)[][]
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{titulo}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b">
            {encabezados.map((h) => (
              <th key={h} className="text-left pb-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(([id, ...celdas]) => (
            <tr key={id} className="border-b last:border-0">
              {celdas.map((c, i) => (
                <td key={i} className={`py-2 ${i === 0 ? 'font-mono text-xs' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
          {filas.length === 0 && (
            <tr><td colSpan={encabezados.length} className="py-4 text-center text-gray-400">Sin registros</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
