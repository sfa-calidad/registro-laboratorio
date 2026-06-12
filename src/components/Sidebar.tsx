'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/ingresos', label: 'Ingresos', icon: '🚛' },
  { href: '/despachos', label: 'Despachos', icon: '📦' },
  { href: '/rotulos', label: 'Rótulos', icon: '🏷️' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold">Laboratorio SFA</h1>
        <p className="text-xs text-slate-400">Gestión de Movimientos</p>
      </div>
      <nav className="flex-1 p-3">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
              pathname === href
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 text-xs text-slate-500 border-t border-slate-700">
        v1.0.0
      </div>
    </aside>
  )
}
