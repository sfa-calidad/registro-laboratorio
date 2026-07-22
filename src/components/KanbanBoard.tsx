'use client'
import { useState } from 'react'
import { formatDateOnly } from '@/lib/utils'

type Analista = { id: number; nombre: string; apellido: string }
type Columna = { id: number; nombre: string; orden: number }
type Etiqueta = { texto: string; color: string }
type Nota = { texto: string; mostrarEnTarjeta: boolean }
type ChecklistItem = { texto: string; hecho: boolean }
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
  etiquetas: string | null
  notas: string | null
  archivadaAt: string | Date | null
  checklist: string | null
  mostrarChecklist: boolean
}

const COLORES_ETIQUETA = ['#8bc53f', '#e0a32a', '#b6394a', '#2b332a', '#3b82f6', '#a855f7']

function parseEtiquetas(json: string | null): Etiqueta[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function parseNotas(json: string | null): Nota[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function parseChecklist(json: string | null): ChecklistItem[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-green-100 text-green-700',
}

const PRIORIDAD_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

type Props = {
  initialColumnas: Columna[]
  initialTareas: Tarea[]
  analistas: Analista[]
  role: 'supervisor' | 'analista'
}

function emptyForm() {
  return {
    titulo: '', descripcion: '', prioridad: '' as string, fechaVencimiento: '',
    analistaId1: '' as string, analistaId2: '' as string,
    etiquetas: [] as Etiqueta[], notas: [] as Nota[],
    checklist: [] as ChecklistItem[], mostrarChecklist: false,
  }
}

function vencimientoBadge(fecha: string | Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // fechaVencimiento se guarda como medianoche UTC: se toma su día por
  // componentes UTC para no correrlo al comparar en zonas horarias negativas.
  const v = new Date(fecha)
  const venc = new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())
  const diffDays = Math.round((venc.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-500'
}

export default function KanbanBoard({ initialColumnas, initialTareas, analistas, role }: Props) {
  const [columnas, setColumnas] = useState(initialColumnas)
  const [tareas, setTareas] = useState(initialTareas)
  const [modal, setModal] = useState<null | { mode: 'create'; columnaId: number } | { mode: 'edit'; tarea: Tarea }>(null)
  const [form, setForm] = useState(emptyForm())
  const [firmaModal, setFirmaModal] = useState<null | { tareaId: number; slot: 1 | 2; aviso?: string; moveTo?: number }>(null)
  const [boardMsg, setBoardMsg] = useState('')
  const [firmaAnalistaId, setFirmaAnalistaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterAnalistaId, setFilterAnalistaId] = useState('')
  const [dragOverColId, setDragOverColId] = useState<number | null>(null)
  const [previewTarea, setPreviewTarea] = useState<Tarea | null>(null)
  const [newEtiquetaTexto, setNewEtiquetaTexto] = useState('')
  const [newEtiquetaColor, setNewEtiquetaColor] = useState(COLORES_ETIQUETA[0])
  const [newNotaTexto, setNewNotaTexto] = useState('')
  const [newNotaMostrar, setNewNotaMostrar] = useState(false)
  const [newChecklistTexto, setNewChecklistTexto] = useState('')

  function openCreate(columnaId: number) {
    setForm(emptyForm())
    setNewEtiquetaTexto('')
    setNewNotaTexto('')
    setNewNotaMostrar(false)
    setNewChecklistTexto('')
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
      etiquetas: parseEtiquetas(tarea.etiquetas),
      notas: parseNotas(tarea.notas),
      checklist: parseChecklist(tarea.checklist),
      mostrarChecklist: tarea.mostrarChecklist,
    })
    setNewChecklistTexto('')
    setModal({ mode: 'edit', tarea })
  }

  function addEtiqueta() {
    if (!newEtiquetaTexto.trim()) return
    setForm(f => ({ ...f, etiquetas: [...f.etiquetas, { texto: newEtiquetaTexto.trim(), color: newEtiquetaColor }] }))
    setNewEtiquetaTexto('')
  }

  function removeEtiqueta(idx: number) {
    setForm(f => ({ ...f, etiquetas: f.etiquetas.filter((_, i) => i !== idx) }))
  }

  function addNota() {
    if (!newNotaTexto.trim()) return
    setForm(f => ({ ...f, notas: [...f.notas, { texto: newNotaTexto.trim(), mostrarEnTarjeta: newNotaMostrar }] }))
    setNewNotaTexto('')
    setNewNotaMostrar(false)
  }

  function removeNota(idx: number) {
    setForm(f => ({ ...f, notas: f.notas.filter((_, i) => i !== idx) }))
  }

  function addChecklistItem() {
    if (!newChecklistTexto.trim()) return
    setForm(f => ({ ...f, checklist: [...f.checklist, { texto: newChecklistTexto.trim(), hecho: false }] }))
    setNewChecklistTexto('')
  }

  function removeChecklistItem(idx: number) {
    setForm(f => ({ ...f, checklist: f.checklist.filter((_, i) => i !== idx) }))
  }

  function toggleChecklistItem(idx: number) {
    setForm(f => ({ ...f, checklist: f.checklist.map((c, i) => i === idx ? { ...c, hecho: !c.hecho } : c) }))
  }

  async function toggleCardChecklistItem(tarea: Tarea, idx: number) {
    const items = parseChecklist(tarea.checklist).map((c, i) => i === idx ? { ...c, hecho: !c.hecho } : c)
    const res = await fetch(`/api/tareas/${tarea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: JSON.stringify(items) }),
    })
    if (res.ok) {
      const t = await res.json()
      setTareas(prev => prev.map(x => x.id === t.id ? t : x))
      if (previewTarea?.id === t.id) setPreviewTarea(t)
    }
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
      etiquetas: form.etiquetas.length ? JSON.stringify(form.etiquetas) : null,
      notas: form.notas.length ? JSON.stringify(form.notas) : null,
      checklist: form.checklist.length ? JSON.stringify(form.checklist) : null,
      mostrarChecklist: form.mostrarChecklist,
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

  async function moveTaskToColumn(tarea: Tarea, targetColumnId: number) {
    if (targetColumnId === tarea.columnaId) return
    const target = columnas.find(c => c.id === targetColumnId)
    if (!target) return

    const isCompleting = target.nombre.toLowerCase().includes('complet')
    if (isCompleting && !tarea.firma1) {
      // Sin alert() nativo: en la app de escritorio (Electron) el alert rompe
      // el foco de la ventana y el modal siguiente queda inutilizable.
      // El aviso se muestra dentro del propio modal de firma, y al firmar la
      // tarjeta se mueve sola a la columna de destino.
      setFirmaModal({
        tareaId: tarea.id,
        slot: 1,
        aviso: 'La tarea necesita al menos una firma antes de pasar a Completado. Al firmar, se moverá automáticamente.',
        moveTo: target.id,
      })
      setFirmaAnalistaId('')
      return
    }

    // Actualización optimista: la tarjeta se mueve al instante y solo se
    // revierte si el servidor rechaza el cambio.
    const previa = tarea
    const completadaAt = isCompleting ? new Date().toISOString() : null
    setTareas(prev => prev.map(x => x.id === tarea.id ? { ...x, columnaId: target.id, completadaAt } : x))

    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnaId: target.id, completadaAt }),
      })
      if (res.ok) {
        const t = await res.json()
        setTareas(prev => prev.map(x => x.id === t.id ? t : x))
      } else {
        setTareas(prev => prev.map(x => x.id === previa.id ? previa : x))
        const err = await res.json().catch(() => null)
        showBoardMsg(err?.error || 'No se pudo mover la tarea.')
      }
    } catch {
      setTareas(prev => prev.map(x => x.id === previa.id ? previa : x))
      showBoardMsg('No se pudo mover la tarea: sin conexión con el servidor.')
    }
  }

  // Aviso no bloqueante: los alert() nativos rompen el foco en la app de escritorio.
  function showBoardMsg(text: string) {
    setBoardMsg(text)
    setTimeout(() => setBoardMsg(''), 4000)
  }

  async function moveTask(tarea: Tarea, direction: 'left' | 'right') {
    const sorted = [...columnas].sort((a, b) => a.orden - b.orden)
    const idx = sorted.findIndex(c => c.id === tarea.columnaId)
    const target = direction === 'left' ? sorted[idx - 1] : sorted[idx + 1]
    if (!target) return
    await moveTaskToColumn(tarea, target.id)
  }

  function handleDragStart(e: React.DragEvent, tareaId: number) {
    e.dataTransfer.setData('text/plain', String(tareaId))
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, columnaId: number) {
    e.preventDefault()
    setDragOverColId(null)
    const tareaId = Number(e.dataTransfer.getData('text/plain'))
    const tarea = tareas.find(t => t.id === tareaId)
    if (tarea) moveTaskToColumn(tarea, columnaId)
  }

  async function deleteTask(id: number) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    setTareas(prev => prev.filter(x => x.id !== id))
  }

  async function archiveTask(id: number) {
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivadaAt: new Date().toISOString() }),
    })
    if (res.ok) setTareas(prev => prev.filter(x => x.id !== id))
  }

  async function archiveAllCompletadas() {
    const completadasCount = tareas.filter(t => t.completadaAt).length
    if (completadasCount === 0) return
    if (!confirm(`¿Archivar las ${completadasCount} tareas completadas? Desaparecerán del tablero.`)) return
    const res = await fetch('/api/tareas/archivar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todasCompletadas: true }),
    })
    if (res.ok) setTareas(prev => prev.filter(t => !t.completadaAt))
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
    let firmada: Tarea | null = null
    if (res.ok) {
      firmada = await res.json()
      setTareas(prev => prev.map(x => x.id === firmada!.id ? firmada! : x))
    }
    const moveTo = firmaModal.moveTo
    setSaving(false)
    setFirmaModal(null)
    setFirmaAnalistaId('')
    // Si la firma vino del intento de pasar a Completado, ahora sí se mueve.
    if (firmada && moveTo) moveTaskToColumn(firmada, moveTo)
  }

  const sortedColumnas = [...columnas].sort((a, b) => a.orden - b.orden)
  const visibleTareas = filterAnalistaId
    ? tareas.filter(t => t.analistaId1 === Number(filterAnalistaId) || t.analistaId2 === Number(filterAnalistaId))
    : tareas

  const completadasCount = tareas.filter(t => t.completadaAt).length

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Filtrar por analista:</label>
          <select
            value={filterAnalistaId}
            onChange={e => setFilterAnalistaId(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="">Todos</option>
            {analistas.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
            ))}
          </select>
        </div>
        {role === 'supervisor' && completadasCount > 0 && (
          <button
            onClick={archiveAllCompletadas}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex-shrink-0"
          >
            Archivar todas las completadas ({completadasCount})
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {sortedColumnas.map((col, colIdx) => {
          const colTareas = visibleTareas.filter(t => t.columnaId === col.id)
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={e => { e.preventDefault(); setDragOverColId(col.id) }}
              onDragLeave={() => setDragOverColId(prev => (prev === col.id ? null : prev))}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="bg-gray-100 rounded-t-lg px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">{col.nombre}</span>
                <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5">{colTareas.length}</span>
              </div>
              <div className={`bg-gray-50 rounded-b-lg flex-1 p-2 space-y-2 min-h-32 transition-colors ${dragOverColId === col.id ? 'bg-brand-green-light ring-2 ring-brand-green' : ''}`}>
                {colTareas.map(t => {
                  const tEtiquetas = parseEtiquetas(t.etiquetas)
                  const tNotasVisibles = parseNotas(t.notas).filter(n => n.mostrarEnTarjeta)
                  const tChecklist = parseChecklist(t.checklist)
                  const tChecklistDone = tChecklist.filter(c => c.hecho).length
                  return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => handleDragStart(e, t.id)}
                    onClick={() => setPreviewTarea(t)}
                    className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-medium text-gray-800 text-sm leading-snug">{t.titulo}</span>
                      {t.prioridad && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORIDAD_COLORS[t.prioridad] || ''}`}>
                          {PRIORIDAD_LABELS[t.prioridad] || t.prioridad}
                        </span>
                      )}
                    </div>
                    {tEtiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {tEtiquetas.map((et, idx) => (
                          <span key={idx} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ borderColor: et.color, color: et.color }}>
                            {et.texto}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.descripcion && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{t.descripcion}</p>}
                    {tNotasVisibles.length > 0 && (
                      <div className="mb-2 space-y-0.5">
                        {tNotasVisibles.map((n, idx) => (
                          <p key={idx} className="text-xs text-gray-500 italic line-clamp-2">📌 {n.texto}</p>
                        ))}
                      </div>
                    )}
                    {t.mostrarChecklist && tChecklist.length > 0 && (
                      <div className="mb-2 space-y-0.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-green" style={{ width: `${tChecklist.length ? (tChecklistDone / tChecklist.length) * 100 : 0}%` }} />
                          </div>
                          <span>{tChecklistDone}/{tChecklist.length}</span>
                        </div>
                        {tChecklist.map((c, idx) => (
                          <label key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <input type="checkbox" checked={c.hecho} onChange={() => toggleCardChecklistItem(t, idx)} />
                            <span className={c.hecho ? 'line-through text-gray-400' : ''}>{c.texto}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {t.fechaVencimiento && (
                      <div className={`text-xs mb-2 inline-block px-1.5 py-0.5 rounded-full ${vencimientoBadge(t.fechaVencimiento)}`}>
                        Vence: {formatDateOnly(t.fechaVencimiento)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.firma1 ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.firma1.nombre} {t.firma1.apellido}</span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setFirmaModal({ tareaId: t.id, slot: 1 }); setFirmaAnalistaId('') }}
                          className="text-xs text-gray-400 hover:text-brand-green-dark border border-dashed border-gray-300 hover:border-brand-green px-2 py-0.5 rounded-full"
                        >
                          + Firma 1
                        </button>
                      )}
                      {t.firma2 ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.firma2.nombre} {t.firma2.apellido}</span>
                      ) : t.firma1 ? (
                        <button
                          onClick={e => { e.stopPropagation(); setFirmaModal({ tareaId: t.id, slot: 2 }); setFirmaAnalistaId('') }}
                          className="text-xs text-gray-400 hover:text-brand-green-dark border border-dashed border-gray-300 hover:border-brand-green px-2 py-0.5 rounded-full"
                        >
                          + Firma 2
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {colIdx > 0 && (
                        <button onClick={e => { e.stopPropagation(); moveTask(t, 'left') }} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Mover izquierda">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                      )}
                      {colIdx < sortedColumnas.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); moveTask(t, 'right') }} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Mover derecha">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEdit(t) }} className="text-gray-500 hover:text-brand-green-dark bg-gray-50 hover:bg-brand-green-light p-1.5 rounded ml-auto" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {role === 'supervisor' && t.completadaAt && (
                        <button onClick={e => { e.stopPropagation(); archiveTask(t.id) }} className="text-gray-400 hover:text-brand-green-dark p-1 rounded" title="Archivar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        </button>
                      )}
                      {role === 'supervisor' && (
                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }} className="text-gray-400 hover:text-red-500 p-1 rounded" title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  )
                })}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}</h3>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Analista 1</label>
                  <select
                    value={form.analistaId1}
                    onChange={e => setForm(f => ({ ...f, analistaId1: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="">— Ninguno —</option>
                    {analistas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Etiquetas</label>
                {form.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {form.etiquetas.map((et, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: et.color, color: et.color }}>
                        {et.texto}
                        <button onClick={() => removeEtiqueta(idx)} className="hover:opacity-60">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={newEtiquetaTexto}
                    onChange={e => setNewEtiquetaTexto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEtiqueta())}
                    placeholder="Texto de la etiqueta"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <div className="flex gap-1">
                    {COLORES_ETIQUETA.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewEtiquetaColor(c)}
                        className={`w-5 h-5 rounded-full ${newEtiquetaColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={addEtiqueta} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Agregar</button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notas</label>
                {form.notas.length > 0 && (
                  <ul className="space-y-1 mt-1 mb-2">
                    {form.notas.map((n, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-2 text-sm bg-gray-50 rounded-lg px-2 py-1">
                        <span className="flex-1">
                          {n.texto}
                          {n.mostrarEnTarjeta && <span className="text-xs text-gray-400 ml-1">(en tarjeta)</span>}
                        </span>
                        <button onClick={() => removeNota(idx)} className="text-gray-400 hover:text-red-500">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <textarea
                  value={newNotaTexto}
                  onChange={e => setNewNotaTexto(e.target.value)}
                  rows={2}
                  placeholder="Nueva nota"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={newNotaMostrar} onChange={e => setNewNotaMostrar(e.target.checked)} />
                    Mostrar en tarjeta
                  </label>
                  <button type="button" onClick={addNota} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Agregar nota</button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Lista de comprobación</label>
                {form.checklist.length > 0 && (
                  <ul className="space-y-1 mt-1 mb-2">
                    {form.checklist.map((c, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-lg px-2 py-1">
                        <label className="flex items-center gap-1.5 flex-1">
                          <input type="checkbox" checked={c.hecho} onChange={() => toggleChecklistItem(idx)} />
                          <span className={c.hecho ? 'line-through text-gray-400' : ''}>{c.texto}</span>
                        </label>
                        <button onClick={() => removeChecklistItem(idx)} className="text-gray-400 hover:text-red-500">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newChecklistTexto}
                    onChange={e => setNewChecklistTexto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    placeholder="Nuevo ítem"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <button type="button" onClick={addChecklistItem} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Agregar</button>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-1.5">
                  <input type="checkbox" checked={form.mostrarChecklist} onChange={e => setForm(f => ({ ...f, mostrarChecklist: e.target.checked }))} />
                  Mostrar lista en la tarjeta
                </label>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={saveTask}
                disabled={saving || !form.titulo.trim()}
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewTarea && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTarea(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-800 leading-snug">{previewTarea.titulo}</h3>
              {previewTarea.prioridad && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORIDAD_COLORS[previewTarea.prioridad] || ''}`}>
                  {PRIORIDAD_LABELS[previewTarea.prioridad] || previewTarea.prioridad}
                </span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {parseEtiquetas(previewTarea.etiquetas).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parseEtiquetas(previewTarea.etiquetas).map((et, idx) => (
                    <span key={idx} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ borderColor: et.color, color: et.color }}>
                      {et.texto}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{previewTarea.descripcion || 'Sin descripción.'}</p>
              {parseNotas(previewTarea.notas).length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  {parseNotas(previewTarea.notas).map((n, idx) => (
                    <p key={idx} className="text-xs text-gray-500 italic">📌 {n.texto}</p>
                  ))}
                </div>
              )}
              {parseChecklist(previewTarea.checklist).length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  {parseChecklist(previewTarea.checklist).map((c, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={c.hecho} onChange={() => toggleCardChecklistItem(previewTarea, idx)} />
                      <span className={c.hecho ? 'line-through text-gray-400' : 'text-gray-700'}>{c.texto}</span>
                    </label>
                  ))}
                </div>
              )}
              {previewTarea.fechaVencimiento && (
                <div className={`text-xs inline-block px-1.5 py-0.5 rounded-full ${vencimientoBadge(previewTarea.fechaVencimiento)}`}>
                  Vence: {formatDateOnly(previewTarea.fechaVencimiento)}
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setPreviewTarea(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
              <button
                onClick={() => { const t = previewTarea; setPreviewTarea(null); openEdit(t) }}
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {boardMsg && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white bg-brand-red animate-fade-in">
          ⚠️ {boardMsg}
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
              {firmaModal.aviso && (
                <div className="mb-3 rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark">
                  {firmaModal.aviso}
                </div>
              )}
              <label className="text-sm font-medium text-gray-700">Seleccionar analista</label>
              <select
                value={firmaAnalistaId}
                onChange={e => setFirmaAnalistaId(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50"
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
