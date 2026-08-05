'use client'

import { useActionState } from 'react'
import { editarGuiaRemision, type EstadoFormulario } from '../actions'
import { hoyPeruISO, haceNDiasPeruISO } from '@/lib/fecha'

type Guia = {
  id: number
  numero: string
  fecha: string
  direccion_despacho: string | null
  observacion: string | null
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function EditarGuiaForm({ guia }: { guia: Guia }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarGuiaRemision, { error: null })

  return (
    <form action={formAction} className="mt-5 space-y-5">
      <input type="hidden" name="id" value={guia.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Número *</label>
          <input type="text" name="numero" required defaultValue={guia.numero} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Fecha *</label>
          <input
            type="date"
            name="fecha"
            required
            min={haceNDiasPeruISO(3)}
            max={hoyPeruISO()}
            defaultValue={guia.fecha}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Dirección de despacho</label>
          <input
            type="text"
            name="direccion_despacho"
            defaultValue={guia.direccion_despacho ?? ''}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Observación</label>
          <input type="text" name="observacion" defaultValue={guia.observacion ?? ''} className={CAMPO} />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-md bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95"
      >
        Guardar cambios
      </button>
    </form>
  )
}
