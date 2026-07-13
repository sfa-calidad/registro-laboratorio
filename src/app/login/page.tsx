'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const [role, setRole] = useState<'supervisor' | 'analista'>('analista')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const expired = searchParams.get('expired') === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role }),
      })
      if (res.ok) {
        // La pantalla de carga necesita pintarse antes de navegar; el pequeño
        // retraso garantiza que se vea y queda visible hasta que carga el sistema.
        setSuccess(true)
        const from = searchParams.get('from') || '/'
        setTimeout(() => { window.location.href = from }, 450)
        return
      }
      setError(res.status === 503 ? 'El login no está configurado en el servidor' : 'Contraseña incorrecta')
    } catch {
      setError('No se pudo conectar con el servidor')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      {success && (
        <div className="fixed inset-0 z-50 bg-brand-dark flex flex-col items-center justify-center gap-5 animate-fade-in">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-brand-green/25" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-green animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">¡Bienvenido!</p>
            <p className="text-slate-300 text-sm mt-1">Cargando el sistema…</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm border-t-4 border-brand-green">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-dark">Laboratorio <span className="text-brand-green">SFA</span></h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de Movimientos</p>
        </div>
        {expired && !success && (
          <div className="mb-4 rounded-lg bg-brand-mustard/10 border border-brand-mustard/40 px-3 py-2 text-sm text-brand-mustard-dark">
            Tu sesión expiró. Ingresá de nuevo para continuar.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Rol</label>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                onClick={() => setRole('analista')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${role === 'analista' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Analista
              </button>
              <button
                type="button"
                onClick={() => setRole('supervisor')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${role === 'supervisor' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Supervisor
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresá la contraseña"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              autoFocus
            />
          </div>
          {error && <p className="text-brand-red text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-white py-2 rounded-lg font-medium hover:bg-brand-green-dark disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
