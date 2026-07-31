'use client'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TiemposDeCierre } from '@/lib/metricas'

export type SemanaFlujo = {
  semana: string
  etiqueta: string
  identificadas: number
  resueltas: number
  analisis: number
}

export type TramoAtraso = { clave: string; etiqueta: string; cantidad: number }

const VERDE = '#8bc53f'
const VERDE_OSCURO = '#6fa32e'
const MOSTAZA = '#e0a32a'
const ROJO = '#b6394a'
const GRIS = '#d1d5db'

// El color del tramo sigue la semántica de docs/ESTILOS.md: verde está bien,
// mostaza hay que mirarlo, rojo hay que actuar.
const COLOR_TRAMO: Record<string, string> = {
  '0-7': VERDE,
  '8-15': MOSTAZA,
  '16-30': ROJO,
  '+30': '#973040',
}

export default function FlujoLaboratorio({
  semanas,
  atrasos,
  demoradas,
  pendientes,
  tiemposInterno,
  tiemposExterno,
  dias,
}: {
  semanas: SemanaFlujo[]
  atrasos: TramoAtraso[]
  demoradas: number
  pendientes: number
  tiemposInterno: TiemposDeCierre
  tiemposExterno: TiemposDeCierre
  dias: number
}) {
  const hayMovimiento = semanas.some((s) => s.identificadas + s.resueltas + s.analisis > 0)

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <div className="border-b pb-2 mb-4">
          <h4 className="font-semibold text-gray-700">Ritmo: lo que entra contra lo que sale</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            Muestras identificadas cada semana y muestras que se resolvieron. Si la línea queda por
            debajo de las barras varias semanas seguidas, el pendiente está creciendo.
          </p>
        </div>
        {hayMovimiento ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={semanas} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: GRIS }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(v) => `Semana del ${v}`}
                contentStyle={{ borderRadius: 8, border: `1px solid ${GRIS}`, fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="identificadas" name="Muestras identificadas" fill={VERDE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="analisis" name="Análisis de tanque" fill={GRIS} radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="resueltas"
                name="Muestras resueltas"
                stroke={VERDE_OSCURO}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Vacio>Todavía no hay movimiento en las últimas semanas.</Vacio>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="border-b pb-2 mb-4">
            <h4 className="font-semibold text-gray-700">Cuánto tarda una muestra</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Días desde que se identifica hasta que tiene resultado, sobre las que se cerraron en los
              últimos {dias} días.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <BloqueTiempo titulo="Laboratorio interno" t={tiemposInterno} />
            <BloqueTiempo titulo="Laboratorio externo" t={tiemposExterno} />
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Se usa la mediana y no el promedio: una muestra olvidada corre el promedio y esconde lo que
            pasa siempre. El p90 dice que una de cada diez tarda más que ese valor.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="border-b pb-2 mb-4">
            <h4 className="font-semibold text-gray-700">Qué está pendiente y hace cuánto</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Las {pendientes} muestras sin resultado, por antigüedad desde que se tomaron.
            </p>
          </div>
          {pendientes > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={atrasos} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="etiqueta"
                    width={110}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [String(v ?? 0), 'Muestras']}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${GRIS}`, fontSize: 13 }}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                    {atrasos.map((t) => (
                      <Cell key={t.clave} fill={COLOR_TRAMO[t.clave]} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              {demoradas > 0 && (
                <div className="mt-3 rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark">
                  <b>{demoradas}</b> {demoradas === 1 ? 'muestra enviada sigue' : 'muestras enviadas siguen'} sin
                  protocolo después de 15 días. Hay que reclamar al laboratorio.
                </div>
              )}
            </>
          ) : (
            <Vacio>No hay muestras pendientes.</Vacio>
          )}
        </div>
      </div>
    </section>
  )
}

function BloqueTiempo({ titulo, t }: { titulo: string; t: TiemposDeCierre }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-700">{titulo}</p>
      {t.medianaDias === null ? (
        <p className="text-sm text-gray-400 mt-2">Sin muestras cerradas en el período.</p>
      ) : (
        <>
          <p className="text-3xl font-bold text-brand-dark mt-1">
            {t.medianaDias}
            <span className="text-base font-medium text-gray-500"> días</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">p90: {t.p90Dias} días</p>
          {/* La cobertura evita leer la mediana sin saber sobre cuánto se
              calculó: una muestra puede cerrarse con resultado o protocolo sin
              fecha, y esa no se puede medir. */}
          <p className="text-xs text-gray-400 mt-2">
            Medido sobre {t.medidas} de {t.cerradas} cerradas
            {t.medidas < t.cerradas && ' (al resto le falta la fecha de resultado)'}
          </p>
        </>
      )}
    </div>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 py-10 text-center">{children}</p>
}
