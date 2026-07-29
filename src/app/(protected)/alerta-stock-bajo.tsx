'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ProductoStockBajo = { id: number; nombre: string; cantidad: number; punto_reorden: number | null }

const CLAVE_SESION = 'limpiezapro-alerta-stock-bajo-cerrada'

export function AlertaStockBajo({ stockBajo }: { stockBajo: ProductoStockBajo[] }) {
  const [visible, setVisible] = useState(false)
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    if (stockBajo.length === 0) return
    if (sessionStorage.getItem(CLAVE_SESION)) return
    setVisible(true)
    const id = requestAnimationFrame(() => setAnimar(true))
    return () => cancelAnimationFrame(id)
  }, [stockBajo])

  function cerrar() {
    setAnimar(false)
    sessionStorage.setItem(CLAVE_SESION, '1')
    setTimeout(() => setVisible(false), 200)
  }

  if (!visible || stockBajo.length === 0) return null

  const mostrados = stockBajo.slice(0, 3)
  const restantes = stockBajo.length - mostrados.length

  return (
    <div
      className={`fixed right-6 bottom-6 z-50 w-80 rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-2xl shadow-red-500/20 transition-all duration-200 print:hidden ${
        animar ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚨</span>
          <p className="text-sm font-extrabold text-red-700">Stock insuficiente</p>
        </div>
        <button type="button" onClick={cerrar} title="Cerrar" className="text-red-400 transition-colors hover:text-red-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-xs font-semibold text-red-600">Reabastece inventario cuanto antes.</p>

      <div className="mt-3 space-y-1.5">
        {mostrados.map((p) => (
          <Link
            key={p.id}
            href={`/productos/${p.id}/editar`}
            onClick={cerrar}
            className="block rounded-lg bg-white dark:bg-[#141a2e] px-3 py-2 text-xs font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:bg-red-100"
          >
            {p.nombre} — stock: {p.cantidad} (mín. {p.punto_reorden ?? '—'})
          </Link>
        ))}
        {restantes > 0 && (
          <p className="text-xs font-medium text-red-500">
            +{restantes} producto{restantes === 1 ? '' : 's'} más
          </p>
        )}
      </div>

      <Link href="/productos" onClick={cerrar} className="mt-3 block text-center text-xs font-bold text-red-700 underline">
        Ver todos en Productos
      </Link>
    </div>
  )
}
