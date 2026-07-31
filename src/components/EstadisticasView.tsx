'use client'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SIN_ASIGNAR } from '@/lib/metricas'

export type FilaAnalista = {
  nombre: string
  tareasCompletadas: number
  tareasEnCurso: number
  medianaDiasTarea: number | null
  analisis: number
  muestras: number
  movimientos: number
}

const VERDE = '#8bc53f'
const VERDE_OSCURO = '#6fa32e'
const MOSTAZA = '#e0a32a'
const GRIS = '#d1d5db'

export default function EstadisticasView({
  filas,
  cobertura,
  dias,
}: {
  filas: FilaAnalista[]
  cobertura: { conDato: number; total: number; porcentaje: number }
  dias: number
}) {
  if (filas.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow p-5">
        <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">Carga de trabajo por analista</h4>
        <p className="text-sm text-gray-400 py-8 text-center">
          No hay analistas cargados. Se agregan desde Configuración.
        </p>
      </section>
    )
  }

  // El gráfico deja afuera "Sin asignar": no es una persona y su barra
  // desplazaría la escala. En la tabla sí aparece, porque el dato importa.
  const paraGrafico = filas.filter((f) => f.nombre !== SIN_ASIGNAR)
  const alto = Math.max(200, paraGrafico.length * 46 + 60)

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <div className="border-b pb-2 mb-4">
          <h4 className="font-semibold text-gray-700">Carga de trabajo por analista</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            Lo que cada uno cargó y firmó en los últimos {dias} días. Sirve para ver cómo está repartido
            el trabajo, no para comparar rendimiento entre personas.
          </p>
        </div>

        {paraGrafico.length > 0 && (
          <ResponsiveContainer width="100%" height={alto}>
            <BarChart data={paraGrafico} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="nombre"
                width={150}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRIS}`, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="tareasCompletadas" name="Tareas completadas" stackId="t" fill={VERDE} />
              <Bar dataKey="tareasEnCurso" name="Tareas en curso" stackId="t" fill={MOSTAZA} radius={[0, 4, 4, 0]} />
              <Bar dataKey="analisis" name="Análisis de tanque" fill={VERDE_OSCURO} radius={[0, 4, 4, 0]} />
              <Bar dataKey="muestras" name="Muestras cargadas" fill={GRIS} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Analista</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Tareas completadas</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">En curso</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Días por tarea</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Análisis</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Muestras</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Movimientos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.nombre}
                  className={`border-b last:border-0 hover:bg-gray-50 ${f.nombre === SIN_ASIGNAR ? 'text-gray-400 italic' : ''}`}
                >
                  <td className="px-3 py-2">{f.nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.tareasCompletadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.tareasEnCurso}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {f.medianaDiasTarea === null ? '—' : f.medianaDiasTarea}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.analisis}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.muestras}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.movimientos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-400 mt-4 space-y-1 leading-relaxed">
          <p>
            <b>Días por tarea</b> es la mediana entre que se crea y que se completa. Una tarea firmada
            por dos analistas cuenta para los dos, así que la suma de la columna no es la cantidad de
            tareas.
          </p>
          <CoberturaAviso cobertura={cobertura} />
        </div>
      </div>
    </section>
  )
}

// El analista queda guardado como texto en muestras, análisis y movimientos, y
// los formularios permiten dejarlo vacío. Si la mayoría de los registros no
// tiene nadie cargado, comparar personas es comparar ruido — y eso hay que
// decirlo, no esconderlo.
function CoberturaAviso({ cobertura }: { cobertura: { conDato: number; total: number; porcentaje: number } }) {
  if (cobertura.total === 0) return null
  const bajo = cobertura.porcentaje < 70
  return (
    <p className={bajo ? 'text-brand-mustard-dark' : undefined}>
      {bajo && '⚠ '}
      <b>{cobertura.porcentaje}%</b> de los registros del período ({cobertura.conDato} de {cobertura.total}) tiene
      analista cargado.
      {bajo && ' Con esta cobertura, los números de abajo muestran una parte del trabajo real.'}
    </p>
  )
}
