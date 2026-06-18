'use client'
import { useEffect, useState } from 'react'

type Nota = { id: number; titulo: string | null; texto: string | null; autor: string; createdAt: string }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NotasTablero() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/notas').then(r => r.json()).then(setNotas).catch(() => {})
  }, [])

  async function addNota() {
    if (!titulo.trim() && !texto.trim()) return
    setSaving(true)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo.trim() || null, texto: texto.trim() || null }),
    })
    if (res.ok) {
      const n = await res.json()
      setNotas(prev => [n, ...prev])
      setTitulo('')
      setTexto('')
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deleteNota(id: number) {
    await fetch(`/api/notas/${id}`, { method: 'DELETE' })
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="bg-gray-100 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Información</h3>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-gray-500 hover:text-brand-green-dark hover:bg-white p-1 rounded-full transition-colors"
          title="Agregar nota"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título (opcional)"
            maxLength={120}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={3}
            maxLength={1000}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button
              onClick={addNota}
              disabled={saving || (!titulo.trim() && !texto.trim())}
              className="px-3 py-1.5 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50"
            >
              Publicar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto flex-1">
        {notas.map(n => (
          <div key={n.id} className="flex items-start justify-between gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
            <div className="min-w-0">
              {n.titulo && <p className="text-sm font-semibold text-gray-800">{n.titulo}</p>}
              {n.texto && <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.texto}</p>}
              <p className="text-xs text-gray-400 mt-1 capitalize">{n.autor} · {formatDateTime(n.createdAt)}</p>
            </div>
            <button onClick={() => deleteNota(n.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Eliminar">×</button>
          </div>
        ))}
        {notas.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 text-center py-4">No hay notas todavía.</p>
        )}
      </div>
    </div>
  )
}
