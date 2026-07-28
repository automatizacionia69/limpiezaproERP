'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'shadow-indigo-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    ),
  },
  {
    href: '/productos',
    label: 'Productos',
    modulo: 'productos',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    ),
  },
  {
    href: '/movimientos',
    label: 'Movimientos',
    modulo: 'movimientos',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h18M16.5 3 21 7.5m0 0L16.5 12M21 7.5H3"
      />
    ),
  },
  {
    href: '/compras',
    label: 'Compras',
    modulo: 'compras',
    gradient: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.99-4.716 2.57-7.221A.75.75 0 0 0 20.192 6H5.106M7.5 14.25 5.106 6M7.5 14.25l-1.6 3.045M18.75 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm-9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    ),
  },
  {
    href: '/proveedores',
    label: 'Proveedores',
    modulo: 'proveedores',
    gradient: 'from-cyan-500 to-sky-500',
    glow: 'shadow-cyan-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12"
      />
    ),
  },
  {
    href: '/ventas',
    label: 'Ventas',
    modulo: 'ventas',
    gradient: 'from-teal-500 to-emerald-500',
    glow: 'shadow-teal-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.625c.621 0 1.125.504 1.125 1.125v.375M.75 6.75h22.5M6 6.75v10.5m6-10.5v10.5m6-10.5v10.5"
      />
    ),
  },
  {
    href: '/consulta-ventas',
    label: 'Consulta de Ventas',
    modulo: 'consulta_ventas',
    gradient: 'from-lime-500 to-green-600',
    glow: 'shadow-lime-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    ),
  },
  {
    href: '/clientes',
    label: 'Clientes',
    modulo: 'clientes',
    gradient: 'from-orange-500 to-amber-500',
    glow: 'shadow-orange-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.649M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    ),
  },
  {
    href: '/cotizaciones/nueva',
    label: 'Crear Cotización',
    modulo: 'cotizaciones',
    gradient: 'from-sky-500 to-blue-500',
    glow: 'shadow-sky-500/40',
    exact: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    ),
  },
  {
    href: '/cotizaciones',
    label: 'Consulta de Cotización',
    modulo: 'cotizaciones',
    gradient: 'from-blue-500 to-indigo-500',
    glow: 'shadow-blue-500/40',
    exact: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    ),
  },
  {
    href: '/reportes',
    label: 'Reportes',
    modulo: 'reportes',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'shadow-violet-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    ),
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    adminOnly: true,
    gradient: 'from-rose-500 to-red-500',
    glow: 'shadow-rose-500/40',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    ),
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    adminOnly: true,
    gradient: 'from-slate-500 to-gray-600',
    glow: 'shadow-slate-500/40',
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ),
  },
]

export function Sidebar({
  collapsed,
  rol,
  modulosPermitidos,
}: {
  collapsed: boolean
  rol: string
  modulosPermitidos: string[]
}) {
  const pathname = usePathname()
  const permitidos = new Set(modulosPermitidos)
  const esAdmin = rol === 'admin'
  const items = NAV_ITEMS.filter((item) => {
    if ('adminOnly' in item && item.adminOnly) return esAdmin
    if ('modulo' in item && item.modulo) return permitidos.has(item.modulo)
    return true
  })

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 bg-gradient-to-b from-[#0f172a] via-[#151b2e] to-[#1e1b3a] transition-[width] duration-200 print:hidden ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400" />

      <div className={`flex items-center gap-3 py-6 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
            />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="text-base font-extrabold leading-tight text-white">LimpiezaPro ERP</div>
            <div className="text-[11px] leading-tight text-indigo-300">Gestión de Inventarios</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-6 pt-2 pb-2 text-[10.5px] font-bold tracking-widest text-indigo-400/60 uppercase">
          Menú principal
        </div>
      )}
      <nav className={`space-y-1.5 pb-6 ${collapsed ? 'px-3' : 'px-4'}`}>
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (!('exact' in item && item.exact) && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-2xl py-3.5 text-sm font-bold transition-all ${
                collapsed ? 'justify-center px-0' : 'px-4'
              } ${
                active
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.glow}`
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-5 w-5 shrink-0 transition-transform ${active ? '' : 'group-hover:scale-110'}`}
              >
                {item.icon}
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
