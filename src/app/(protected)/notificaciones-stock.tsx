'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type ProductoStockBajo = {
  id: number
  nombre: string
  cantidad: number
  punto_reorden: number | null
}

export function NotificacionesStock({ stockBajo }: { stockBajo: ProductoStockBajo[] }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [])

  const hayAlertas = stockBajo.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Alertas de stock bajo"
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-[#64748b] dark:text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {hayAlertas && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {stockBajo.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute top-14 right-0 z-30 w-80 overflow-hidden rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-xl">
          <div className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-4 py-3">
            <p className="text-sm font-extrabold text-[#1e293b] dark:text-slate-100">⚠️ Stock bajo</p>
            <p className="text-xs font-medium text-[#64748b] dark:text-slate-400">
              {hayAlertas ? `${stockBajo.length} producto${stockBajo.length === 1 ? '' : 's'} por debajo del mínimo` : 'Todo en orden'}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!hayAlertas ? (
              <p className="p-6 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
                🎉 Ningún producto está por debajo de su stock mínimo.
              </p>
            ) : (
              stockBajo.map((p) => (
                <Link
                  key={p.id}
                  href={`/productos/${p.id}/editar`}
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] dark:border-slate-800 px-4 py-3 transition-colors hover:bg-amber-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1e293b] dark:text-slate-100">{p.nombre}</p>
                    <p className="text-xs text-[#64748b] dark:text-slate-400">
                      Stock: {p.cantidad} · Mínimo: {p.punto_reorden ?? '—'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    Editar
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
