'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { FilaCobranza } from '@/lib/cobranzas'

export function NotificacionesCobranzas({ filas }: { filas: FilaCobranza[] }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  const total = filas.length
  const visibles = filas.slice(0, 5)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Cobranzas pendientes"
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-4.5-2.818.879.659c1.171.879 3.07.879 4.242 0m0 0c1.172-.879 1.172-2.303 0-3.182C11.75 12.219 10.982 12 10.214 12m4.786 3.182c1.172-.879 1.172-2.303 0-3.182C14.25 11.219 13.482 11 12.714 11c-.768 0-1.536-.219-2.121-.659-1.172-.879-1.172-2.303 0-3.182 1.171-.879 3.07-.879 4.242 0l.879.659"
          />
        </svg>
        {total > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute top-14 right-0 z-30 w-80 overflow-hidden rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-xl">
          <div className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3">
            <p className="text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Cobranzas</p>
            <p className="text-xs font-medium text-[#64748b] dark:text-slate-400">
              {total > 0 ? `${total} comprobante${total === 1 ? '' : 's'} por cobrar` : 'Todo al día'}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {total === 0 ? (
              <p className="p-6 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
                No hay cobros pendientes.
              </p>
            ) : (
              visibles.map((f) => (
                <Link
                  key={f.id}
                  href="/cobranzas"
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] dark:border-slate-800 px-4 py-3 transition-colors hover:bg-indigo-50/60 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1e293b] dark:text-slate-100">{f.cliente}</p>
                    <p className="text-xs text-[#64748b] dark:text-slate-400">
                      S/ {f.saldo.toFixed(2)} · {f.numero}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      f.estado === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {f.diasLabel}
                  </span>
                </Link>
              ))
            )}
          </div>

          {total > 5 && (
            <Link
              href="/cobranzas"
              onClick={() => setAbierto(false)}
              className="block border-t-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400"
            >
              Ver los {total} en Cobranzas
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
