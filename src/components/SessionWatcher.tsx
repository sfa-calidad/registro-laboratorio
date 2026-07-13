'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const CHECK_INTERVAL_MS = 5 * 60 * 1000

// Con la ventana abierta sin navegar, el middleware nunca llega a correr.
// Este componente consulta /api/me periódicamente (y al volver el foco a la
// pestaña) y, si la sesión expiró, manda al login con un aviso.
export default function SessionWatcher() {
  const pathname = usePathname()
  const enabled = !pathname.startsWith('/login')

  useEffect(() => {
    if (!enabled) return
    let redirecting = false

    async function check() {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (res.status === 401 && !redirecting) {
          redirecting = true
          const from = encodeURIComponent(window.location.pathname)
          window.location.href = `/login?expired=1&from=${from}`
        }
      } catch {
        // Sin conexión no se decide nada: al navegar, el middleware resuelve.
      }
    }

    const id = setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return null
}
