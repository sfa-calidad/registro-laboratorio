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
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tablero de Tareas</h1>
          <p className="text-sm text-gray-500">Gestión de tareas diarias del laboratorio</p>
        </div>
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
