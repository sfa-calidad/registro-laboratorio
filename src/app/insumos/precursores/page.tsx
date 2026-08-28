import { prisma } from '@/lib/prisma'
import { getRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatearNumero } from '@/lib/inventario'
import { declaracionDePeriodo, mesAnterior } from '@/lib/precursores'
import { hoyEnLaboratorio, formatDateOnly } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export default async function PrecursoresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Es la base de una declaración jurada: la arma el supervisor.
  if ((await getRole()) !== 'supervisor') redirect('/insumos')

  const params = await searchParams
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const porDefecto = mesAnterior(hoyEnLaboratorio())
  const desdeStr = ES_FECHA.test(uno(params.desde) || '') ? (uno(params.desde) as string) : porDefecto.desde
  const hastaStr = ES_FECHA.test(uno(params.hasta) || '') ? (uno(params.hasta) as string) : porDefecto.hasta

  const [sustancias, insumos] = await Promise.all([
    prisma.sustanciaControlada.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.insumo.findMany({
      where: { sustanciaId: { not: null } },
      include: { movimientos: { select: { tipo: true, cantidad: true, stockPrevio: true, stockNuevo: true, fecha: true } } },
    }),
  ])

  const filas = declaracionDePeriodo(
    sustancias,
    insumos,
    new Date(`${desdeStr}T00:00:00.000Z`),
    new Date(`${hastaStr}T00:00:00.000Z`),
  )

  const sinEnlazar = filas.filter((f) => f.insumos.length === 0)
  const qs = `desde=${desdeStr}&hasta=${hastaStr}`

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Precursores químicos</h2>
        <Link href="/insumos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a insumos
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        El consumo del período sale de sumar los movimientos registrados, no de restar dos números
        cargados a mano. Por eso <span className="font-mono text-xs">inicial + entradas − salidas + ajustes</span>{' '}
        siempre da el stock final, y un consumo no puede quedar negativo.
      </p>

      <form method="GET" className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desdeStr}
            className="mt-1 border rounded-lg px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hastaStr}
            className="mt-1 border rounded-lg px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark"
        >
          Calcular
        </button>
        <a
          href={`/api/insumos/precursores/export?${qs}`}
          className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"
        >
          Exportar
        </a>
      </form>

      {sinEnlazar.length > 0 && (
        <div className="rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark mb-4">
          Sin ningún insumo enlazado, así que van en cero:{' '}
          {sinEnlazar.map((f) => f.sustancia.nombre).join(', ')}. Enlazalos desde el formulario del
          insumo para que entren en la declaración.
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Sustancia</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">GTIN</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Inicial</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Entradas</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Salidas</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Ajustes</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Final</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.sustancia.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{f.sustancia.nombre}</div>
                  {f.insumos.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {f.insumos.map((i) => `${i.nombre}${i.presentacion ? ` (${i.presentacion})` : ''}`).join(' · ')}
                    </div>
                  )}
                  {f.sinContenido.length > 0 && (
                    <div className="text-xs text-brand-red-dark">
                      Sin tamaño de envase, no suma: {f.sinContenido.join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{f.sustancia.gtin}</td>
                <td className="px-3 py-2 text-right font-mono">{formatearNumero(f.total.inicial)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatearNumero(f.total.entradas)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatearNumero(f.total.salidas)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">
                  {f.total.ajustes === 0 ? '—' : formatearNumero(f.total.ajustes)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {formatearNumero(f.total.final)}{' '}
                  <span className="text-gray-400 font-normal text-xs">{f.sustancia.unidad}</span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  No hay sustancias controladas cargadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Período del {formatDateOnly(new Date(`${desdeStr}T00:00:00.000Z`))} al{' '}
        {formatDateOnly(new Date(`${hastaStr}T00:00:00.000Z`))}, ambos incluidos. Las cantidades van
        en la unidad en la que se declara cada sustancia.
      </p>
    </div>
  )
}
