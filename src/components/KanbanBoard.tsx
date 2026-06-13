'use client'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

type Analista = { id: number; nombre: string; apellido: string }
type Columna = { id: number; nombre: string; orden: number }
type Tarea = {
  id: number
  titulo: string
  descripcion: string | null
  columnaId: number
  analistaId1: number | null
  analistaId2: number | null
  firma1: Analista | null
  firma2: Analista | null
  prioridad: string | null
  fechaVencimiento: string | Date | null
  completadaAt: string | Date | null
  createdAt: string | Date
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-green-100 text-green-700',
}

type Props = {
  initialColumnas: Columna[]
  initialTareas: Tarea[]
  analistas: Analista[]
  role: 'supervisor' | 'analista'
}

function emptyForm() {
  return { titulo: '', descripcion: '', prioridad: '' as string, fechaVencimiento: '', analistaId1: '' as string, analistaId2: '' as string }
}

export default function KanbanBoard({ initialColumnas, initialTareas, analistas, role }: Props) {
  const [columnas, setColumnas] = useState(initialColumnas)
  const [tareas, setTareas] = useState(initialTareas)
  const [modal, setModal] = useState<null | { mode: 'create'; columnaId: number } | { mode: 'edit'; tarea: Tarea }>(null)
  const [form, setForm] = useState(emptyForm())
  const [firmaModal, setFirmaModal] = useState<null | { tareaId: number; slot: 1 | 2 }>(null)
  const [firmaAnalistaId, setFirmaAnalistaId] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreate(columnaId: number) {
    setForm(emptyForm())
    setModal({ mode: 'create', columnaId })
  }

  function openEdit(tarea: Tarea) {
    setForm({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',
      prioridad: tarea.prioridad || '',
      fechaVencimiento: tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento).toISOString().split('T')[0] : '',
      analistaId1: tarea.analistaId1 ? String(tarea.analistaId1) : '',
      analistaId2: tarea.analistaId2 ? String(tarea.analistaId2) : '',
    })
    setModal({ mode: 'edit', tarea })
  }

  async function saveTask() {
    setSaving(true)
    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      prioridad: form.prioridad || null,
      fechaVencimiento: form.fechaVencimiento || null,
      analistaId1: form.analistaId1 ? Number(form.analistaId1) : null,
      analistaId2: form.analistaId2 ? Number(form.analistaId2) : null,
    }

    if (modal?.mode === 'create') {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, columnaId: modal.columnaId }),
      })
      if (res.ok) {
        const t = await res.json()
        setTareas(prev => [...prev, t])
      }
    } else if (modal?.mode === 'edit') {
      const res = await fetch(`/api/tareas/${modal.tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const t = await res.json()
        setTareas(prev => prev.map(x => x.id === t.id ? t : x))
      }
    }
    setSaving(false)
    setModal(null)
  }

  async function moveTask(tarea: Tarea, direction: 'left' | 'right') {
    const sorted = [...columnas].sort((a, b) => a.orden - b.orden)
    const idx = sorted.findIndex(c => c.id === tarea.columnaId)
    const target = direction === 'left' ? sorted[idx - 1] : sorted[idx + 1]
    if (!target) return

    const isCompleting = target.nombre.toLowerCase().includes('complet')
    const res = await fetch(`/api/tareas/${tarea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        columnaId: target.id,
        completadaAt: isCompleting ? new Date().toISOString() : null,
      }),
    })
    if (res.ok) {
      const t = await res.json()
      setTareas(prev => prev.map(x => x.id === t.id ? t : x))
    }
  }

  async function deleteTask(id: number) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    setTareas(prev => prev.filter(x => x.id !== id))
  }

  async function submitFirma() {
    if (!firmaModal || !firmaAnalistaId) return
    setSaving(true)
    const field = firmaModal.slot === 1 ? 'analistaId1' : 'analistaId2'
    const res = await fetch(`/api/tareas/${firmaModal.tareaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: Number(firmaAnalistaId) }),
    })
    if (res.ok) {
      const t = await res.json()
      setTareas(prev => prev.map(x => x.id === t.id ? t : x))
    }
    setSaving(false)
    setFirmaModal(null)
    setFirmaAnalistaId('')
  }

  const sortedColumnas = [...columnas].sort((a, b) => a.orden - b.orden)

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {sortedColumnas.map((col, colIdx) => {
          const colTareas = tareas.filter(t => t.columnaId === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col">
              <div className="bg-gray-100 rounded-t-lg px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">{col.nombre}</span>
                <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5">{colTareas.length}</span>
              </div>
              <div className="bg-gray-50 rounded-b-lg flex-1 p-2 space-y-2 min-h-32">
                {colTareas.map(t => (
                  <div key={t.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-medium text-gray-800 text-sm leading-snug">{t.titulo}</span>
                      {t.prioridad && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORIDAD_COLORS[t.prioridad] || ''}`}>
                          {t.prioridad}
                        </span>
                      )}
                    </div>
                    {t.descripcion && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{t.descripcion}</p>}
                    {t.fechaVencimiento && (
                      <div className="text-xs text-gray-400 mb-2">Vence: {formatDate(t.fechaVencimiento)}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.firma1 ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t.firma1.nombre} {t.firma1.apellido}</span>
                      ) : (
                        <button
                          onClick={() => { setFirmaModal({ tareaId: t.id, slot: 1 }); setFirmaAnalistaId('') }}
                          className="text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 px-2 py-0.5 rounded-full"
                        >
                          + Firma 1
                        </button>
                      )}
                      {t.firma2 ? (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{t.firma2.nombre} {t.firma2.apellido}</span>
                      ) : t.firma1 ? (
                        <button
                          onClick={() => { setFirmaModal({ tareaId: t.id, slot: 2 }); setFirmaAnalistaId('') }}
                          className="text-xs text-gray-400 hover:text-purple-600 border border-dashed border-gray-300 hover:border-purple-400 px-2 py-0.5 rounded-full"
                        >
                          + Firma 2
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {colIdx > 0 && (
                        <button onClick={() => moveTask(t, 'left')} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Mover izquierda">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                      )}
                      {colIdx < sortedColumnas.length - 1 && (
                        <button onClick={() => moveTask(t, 'right')} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Mover derecha">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      )}
                      <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-blue-600 p-1 rounded ml-auto" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {role === 'supervisor' && (
                        <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded" title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openCreate(col.id)}
                  className="w-full text-left text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  + Nueva tarea
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Task modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sin prioridad —</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Vencimiento</label>
                  <input
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={e => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Analista 1</label>
                  <select
                    value={form.analistaId1}
                    onChange={e => setForm(f => ({ ...f, analistaId1: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Ninguno —</option>
                    {analistas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Analista 2</label>
                  <select
                    value={form.analistaId2}
                    onChange={e => setForm(f => ({ ...f, analistaId2: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Ninguno —</option>
                    {analistas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={saveTask}
                disabled={saving || !form.titulo.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firma modal */}
      {firmaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-800">Firma {firmaModal.slot}</h3>
            </div>
            <div className="p-5">
              <label className="text-sm font-medium text-gray-700">Seleccionar analista</label>
              <select
                value={firmaAnalistaId}
                onChange={e => setFirmaAnalistaId(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              >
                <option value="">— Seleccionar —</option>
                {analistas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                ))}
              </select>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setFirmaModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={submitFirma}
                disabled={saving || !firmaAnalistaId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '...' : 'Firmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
