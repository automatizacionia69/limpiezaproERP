'use client'

import { useState, useTransition } from 'react'
import { convertirCotizacionAVenta } from '../actions'

export function ConvertirVentaBoton({ id, numero }: { id: number; numero: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`¿Convertir la cotización ${numero} en una orden de venta? Se creará como "pendiente".`)) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await convertirCotizacionAVenta(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo convertir la cotización.')
      }
    })
  }

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        {isPending ? 'Convirtiendo...' : 'Convertir a Venta'}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
