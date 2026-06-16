import { prisma } from '@/lib/prisma'
import { getRole } from '@/lib/auth'
import KanbanBoard from '@/components/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function TareasPage() {
  const [columnas, tareas, analistas, role] = await Promise.all([
    prisma.columnaKanban.findMany({ orderBy: { orden: 'asc' } }),
    prisma.tarea.findMany({
      include: { columna: true, firma1: true, firma2: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.analista.findMany({ where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    getRole(),
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tablero de Tareas</h1>
          <p className="text-sm text-gray-500">Gestión de tareas diarias del laboratorio</p>
        </div>
        <a
          href="/api/tareas/export"
          className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex-shrink-0"
        >
          Exportar CSV
        </a>
      </div>
      <KanbanBoard
        initialColumnas={columnas}
        initialTareas={tareas as Parameters<typeof KanbanBoard>[0]['initialTareas']}
        analistas={analistas}
        role={role || 'analista'}
      />
    </div>
  )
}
