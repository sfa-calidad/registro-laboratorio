'use client'
import { useState } from 'react'

export default function ConfiguracionForm({ values }: { values: Record<string, string> }) {
  const [form, setForm] = useState(values)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-2">General</h3>
        <div>
          <label className="text-sm font-medium text-gray-700">Nombre de la empresa</label>
          <input
            value={form.empresa}
            onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Operador predeterminado</label>
          <input
            value={form.operadorPredeterminado}
            onChange={(e) => setForm({ ...form, operadorPredeterminado: e.target.value })}
            placeholder="Nombre que aparece por defecto en los formularios"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-2">Etiquetas (Impresora Zebra)</h3>
        <p className="text-xs text-gray-500">Medidas del rollo de etiquetas en milímetros.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Ancho (mm)</label>
            <input
              type="number"
              value={form.etiquetaAncho}
              onChange={(e) => setForm({ ...form, etiquetaAncho: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Alto (mm)</label>
            <input
              type="number"
              value={form.etiquetaAlto}
              onChange={(e) => setForm({ ...form, etiquetaAlto: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <strong>Vista previa de tamaño:</strong>{' '}
          <span
            className="inline-block border-2 border-dashed border-gray-400 bg-white align-middle ml-2"
            style={{
              width: `${Number(form.etiquetaAncho) * 0.8}px`,
              height: `${Number(form.etiquetaAlto) * 0.8}px`,
            }}
          />
          <span className="ml-2">{form.etiquetaAncho}×{form.etiquetaAlto}mm</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
      </div>
    </form>
  )
}
