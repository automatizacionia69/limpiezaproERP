'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { NotificacionesStock } from './notificaciones-stock'
import { NotificacionesCobranzas } from './notificaciones-cobranzas'
import { AlertaStockBajo } from './alerta-stock-bajo'
import { ThemeToggle } from './theme-toggle'
import type { FilaCobranza } from '@/lib/cobranzas'

type ProductoStockBajo = { id: number; nombre: string; cantidad: number; punto_reorden: number | null }

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
  stockBajo,
  cobranzas,
  signOutAction,
}: {
  children: React.ReactNode
  nombre: string
  rol: string
  modulosPermitidos: string[]
  stockBajo: ProductoStockBajo[]
  cobranzas: FilaCobranza[]
  signOutAction: () => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(false)

  // Evita que la rueda del mouse cambie el valor de un input numérico
  // enfocado (comportamiento nativo del navegador que causa errores
  // silenciosos en cantidades/montos — ej. 3 -> 2.98 sin que se note).
  useEffect(() => {
    function alRodarRueda(e: WheelEvent) {
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement && activo.type === 'number' && e.target === activo) {
        activo.blur()
      }
    }
    document.addEventListener('wheel', alRodarRueda, { passive: true })
    return () => document.removeEventListener('wheel', alRodarRueda)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e7ebf4] to-[#dbe2f2] print:bg-none print:bg-white dark:from-[#0b1120] dark:to-[#0a0e1a]">
      <Sidebar collapsed={collapsed} rol={rol} modulosPermitidos={modulosPermitidos} />

      <div className={`transition-[padding] duration-200 print:pl-0 ${collapsed ? 'pl-20' : 'pl-72'}`}>
        <header className="relative z-30 flex h-20 items-center justify-between border-b border-[#e2e8f0] bg-white/80 px-8 backdrop-blur-sm print:hidden dark:border-slate-800 dark:bg-[#0f172a]/80">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[#64748b] dark:text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificacionesStock stockBajo={stockBajo} />
            <NotificacionesCobranzas filas={cobranzas} />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
              {iniciales(nombre)}
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold leading-tight text-[#1e293b] dark:text-slate-100">{nombre}</div>
              <div className="text-[11px] leading-tight font-medium text-indigo-500 dark:text-indigo-400">
                {ROLE_LABELS[rol] ?? rol}
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex h-11 w-11 items-center justify-center rounded-md text-[#64748b] dark:text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 active:scale-95"
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

      <AlertaStockBajo stockBajo={stockBajo} />
    </div>
  )
}
