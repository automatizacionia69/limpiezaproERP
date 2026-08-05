'use client'

import { useState, useTransition } from 'react'
import { reintentarEnvioNubefact } from '../actions'

export function ReenviarNubefactBoton({ comprobanteId }: { comprobanteId: number }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reenviar() {
    setError(null)
    startTransition(async () => {
      try {
        await reintentarEnvioNubefact(comprobanteId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo reenviar a SUNAT.')
      }
    })
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={reenviar}
        disabled={isPending}
        className="rounded-md bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
      >
        {isPending ? 'Reenviando…' : '🔁 Reintentar envío a SUNAT'}
      </button>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  )
}
