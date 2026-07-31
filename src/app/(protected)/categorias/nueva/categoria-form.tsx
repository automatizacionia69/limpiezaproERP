'use client'

import { useActionState } from 'react'
import { crearCategoria, type EstadoFormulario } from '../actions'

export function CategoriaForm() {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearCategoria, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div>
        <label className="block text-sm font-bold text-[#1e293b] dark:text-slate-100">Nombre *</label>
        <input
          type="text"
          name="nombre"
          required
          autoFocus
          placeholder="ej. Papel, Químicos, Higiene"
          className="mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-gradient-to-r from-violet-500 to-purple-500 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-500/30 transition-all active:scale-95"
      >
        Guardar categoría
      </button>
    </form>
  )
}
