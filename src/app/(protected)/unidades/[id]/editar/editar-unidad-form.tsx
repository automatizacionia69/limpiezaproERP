'use client'

import { useActionState } from 'react'
import { editarUnidad, type EstadoFormulario } from '../../actions'

export function EditarUnidadForm({ unidad }: { unidad: { id: number; nombre: string } }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarUnidad, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={unidad.id} />
      <div>
        <label className="block text-sm font-bold text-[#1e293b]">Nombre *</label>
        <input
          type="text"
          name="nombre"
          required
          defaultValue={unidad.nombre}
          className="mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 py-3.5 text-base font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/40"
      >
        Guardar cambios
      </button>
    </form>
  )
}
