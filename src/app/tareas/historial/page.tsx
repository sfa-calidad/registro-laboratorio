import { prisma } from '@/lib/prisma'
import { getRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HistorialTareasPage() {
  const role = await getRole()
  if (role !== 'supervisor') redirect('/tareas')

  const tareas = await prisma.tarea.findMany({
    where: { completadaAt: { not: null } },
    include: { columna: true, firma1: true, firma2: true },
    orderBy: { completadaAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Historial de tareas completadas</h1>
          <p className="text-sm text-gray-500">Incluye tareas archivadas y no archivadas</p>
        </div>
        <a href="/tareas" className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          Volver al tablero
        </a>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Firma 1</th>
              <th className="text-left p-3">Firma 2</th>
              <th className="text-left p-3">Completada</th>
              <th className="text-left p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map(t => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-gray-800">{t.titulo}</td>
                <td className="p-3">{t.firma1 ? `${t.firma1.nombre} ${t.firma1.apellido}` : '—'}</td>
                <td className="p-3">{t.firma2 ? `${t.firma2.nombre} ${t.firma2.apellido}` : '—'}</td>
                <td className="p-3">{t.completadaAt ? formatDate(t.completadaAt) : '—'}</td>
                <td className="p-3">
                  {t.archivadaAt ? (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archivada</span>
                  ) : (
                    <span className="text-xs bg-brand-green-light text-brand-green-dark px-2 py-0.5 rounded-full">En el tablero</span>
                  )}
                </td>
              </tr>
            ))}
            {tareas.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin tareas completadas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
