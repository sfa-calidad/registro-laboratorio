'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Role = 'supervisor' | 'analista' | null

const baseLinks = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/ingresos',
    label: 'Ingresos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
        <rect x="9" y="11" width="14" height="10" rx="2"/><path d="m13 16 3 3 3-3"/>
      </svg>
    ),
  },
  {
    href: '/despachos',
    label: 'Despachos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
        <rect x="9" y="11" width="14" height="10" rx="2"/><path d="m13 16 3-3 3 3"/>
      </svg>
    ),
  },
  {
    href: '/tanques',
    label: 'Tanques',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    href: '/muestras',
    label: 'Muestras',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2v6l4.5 8.5a2 2 0 0 1-1.76 2.95H7.26a2 2 0 0 1-1.76-2.95L10 8V2"/>
        <line x1="8" y1="2" x2="16" y2="2"/>
        <line x1="7" y1="16" x2="17" y2="16"/>
      </svg>
    ),
  },
  {
    href: '/tareas',
    label: 'Tareas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
      </svg>
    ),
  },
  {
    href: '/rotulos',
    label: 'Rótulos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const onLogin = pathname.startsWith('/login')
  const [role, setRole] = useState<Role>(null)
  const [open, setOpen] = useState(false)
  const [logo, setLogo] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (onLogin) return
    fetch('/api/me').then(r => r.json()).then(d => setRole(d.role)).catch(() => {})
    fetch('/api/configuracion').then(r => r.json()).then(d => setLogo(d.logo || '')).catch(() => {})
    // Preferencia guardada en el navegador: solo se puede leer en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem('sidebar_collapsed') === '1')
  }, [onLogin])

  function toggleCollapsed() {
    setCollapsed(c => {
      localStorage.setItem('sidebar_collapsed', c ? '0' : '1')
      return !c
    })
  }

  // Al navegar se cierra el menú móvil. Patrón de "ajustar estado durante el
  // render" recomendado por React en lugar de un effect con setState.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  const links = baseLinks

  function renderNav(iconOnly: boolean) {
    return (
      <nav className="flex-1 p-3 overflow-y-auto">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            title={iconOnly ? label : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${iconOnly ? 'justify-center' : ''} ${
              pathname === href
                ? 'bg-brand-green text-white'
                : 'text-slate-300 hover:bg-brand-dark-hover'
            }`}
          >
            <span>{icon}</span>
            {!iconOnly && <span>{label}</span>}
          </Link>
        ))}
      </nav>
    )
  }

  function renderFooter(iconOnly: boolean) {
    return (
      <div className="p-3 border-t border-brand-dark-hover space-y-2">
        {role && !iconOnly && (
          <div className="text-xs text-brand-green px-3 capitalize font-medium">{role}</div>
        )}
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/login'
          }}
          title={iconOnly ? 'Cerrar sesión' : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-brand-dark-hover rounded-lg ${iconOnly ? 'justify-center' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {!iconOnly && 'Cerrar sesión'}
        </button>
        {!iconOnly && <div className="text-xs text-slate-500 px-3">v1.4.0</div>}
      </div>
    )
  }

  const navContent = renderNav(false)
  const footerContent = renderFooter(false)

  // En el login todavía no hay sesión: no se muestra la navegación de la app.
  if (onLogin) return null

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-brand-dark text-white p-3">
        <div className="flex items-center gap-2">
          {logo && <img src={logo} alt="Logo" className="h-8 w-8 object-contain rounded bg-white p-0.5" />}
          <div>
            <h1 className="text-base font-bold leading-tight">Laboratorio SFA</h1>
            <p className="text-xs text-slate-400">Gestión de Movimientos</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="p-2 rounded-lg hover:bg-brand-dark-hover"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? (
              <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            ) : (
              <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-brand-dark text-white flex flex-col max-h-[70vh]">
          {navContent}
          {footerContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex bg-brand-dark text-white flex-col transition-all ${collapsed ? 'md:w-16' : 'md:w-56'}`}>
        <div className={`p-4 border-b border-brand-dark-hover flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          {logo && <img src={logo} alt="Logo" className="h-10 w-10 object-contain rounded bg-white p-0.5 flex-shrink-0" />}
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold leading-tight">Laboratorio SFA</h1>
              <p className="text-xs text-slate-400">Gestión de Movimientos</p>
            </div>
          )}
        </div>
        {collapsed ? renderNav(true) : navContent}
        {collapsed ? renderFooter(true) : footerContent}
        <button
          onClick={toggleCollapsed}
          className={`flex items-center justify-center gap-2 p-3 border-t border-brand-dark-hover text-slate-300 hover:text-white hover:bg-brand-dark-hover text-xs`}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {!collapsed && 'Contraer'}
        </button>
      </aside>
    </>
  )
}
