'use client'

import { useActionState } from 'react'
import { crearUnidad, type EstadoFormulario } from '../actions'

export function UnidadForm() {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearUnidad, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div>
        <label className="block text-xs font-bold text-[#1e293b] dark:text-slate-100">Nombre *</label>
        <input
          type="text"
          name="nombre"
          required
          autoFocus
          placeholder="ej. und, paq, caja, rollo"
          className="mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-gradient-to-r from-fuchsia-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95"
      >
        Guardar unidad
      </button>
    </form>
  )
}
