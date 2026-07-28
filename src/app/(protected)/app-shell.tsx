'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function AppShell({
  children,
  nombre,
  rol,
  modulosPermitidos,
  signOutAction,
}: {
  children: React.ReactNode
  nombre: string
  rol: string
  modulosPermitidos: string[]
  signOutAction: () => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#eef2ff]">
      <Sidebar collapsed={collapsed} rol={rol} modulosPermitidos={modulosPermitidos} />

      <div className={`transition-[padding] duration-200 print:pl-0 ${collapsed ? 'pl-20' : 'pl-72'}`}>
        <header className="flex h-20 items-center justify-between border-b border-[#e2e8f0] bg-white/80 px-8 backdrop-blur-sm print:hidden">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#64748b] transition-all hover:bg-indigo-50 hover:text-indigo-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
              {iniciales(nombre)}
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold leading-tight text-[#1e293b]">{nombre}</div>
              <div className="text-[11px] leading-tight font-medium text-indigo-500">
                {ROLE_LABELS[rol] ?? rol}
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#64748b] transition-all hover:bg-red-50 hover:text-red-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H3"
                  />
                </svg>
              </button>
            </form>
          </div>
        </header>

        <main className="w-full px-8 py-10 2xl:px-12 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  )
}
