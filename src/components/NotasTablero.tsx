'use client'
import { useEffect, useState } from 'react'

type Nota = { id: number; texto: string; autor: string; createdAt: string }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NotasTablero() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/notas').then(r => r.json()).then(setNotas).catch(() => {})
  }, [])

  async function addNota() {
    if (!texto.trim()) return
    setSaving(true)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: texto.trim() }),
    })
    if (res.ok) {
      const n = await res.json()
      setNotas(prev => [n, ...prev])
      setTexto('')
    }
    setSaving(false)
  }

  async function deleteNota(id: number) {
    await fetch(`/api/notas/${id}`, { method: 'DELETE' })
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Tablero de información</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNota())}
          placeholder="Dejar una nota importante para el equipo..."
          maxLength={500}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
        <button
          onClick={addNota}
          disabled={saving || !texto.trim()}
          className="px-4 py-2 text-sm bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50 flex-shrink-0"
        >
          Publicar
        </button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {notas.map(n => (
          <div key={n.id} className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.texto}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{n.autor} · {formatDateTime(n.createdAt)}</p>
            </div>
            <button onClick={() => deleteNota(n.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Eliminar">×</button>
          </div>
        ))}
        {notas.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No hay notas todavía.</p>
        )}
      </div>
    </div>
  )
}
