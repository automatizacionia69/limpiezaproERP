'use client'

import { useActionState, useState } from 'react'
import { registrarAjuste, type EstadoFormulario } from './actions'
import { Buscador } from '@/components/buscador'

type Producto = { id: number; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function AjusteForm({ productos }: { productos: Producto[] }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(registrarAjuste, {
    error: null,
  })
  const [productoId, setProductoId] = useState<number | ''>('')

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div>
        <label className={LABEL}>Producto *</label>
        <div className="mt-1.5">
          <Buscador
            opciones={productos}
            valor={productoId}
            onChange={(id) => setProductoId(Number(id) || '')}
            placeholder="Escribe el nombre del producto..."
            name="producto_id"
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Cantidad real (conteo físico) *</label>
        <input type="number" step="1" min="0" name="cantidad" required className={CAMPO} />
        <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Es el total real contado, no la diferencia — el sistema calcula el ajuste solo.
        </p>
      </div>

      <div>
        <label className={LABEL}>Motivo</label>
        <input
          type="text"
          name="motivo"
          placeholder="ej. conteo físico, producto vencido"
          className={CAMPO}
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/30 transition-all active:scale-95"
      >
        Registrar ajuste
      </button>
    </form>
  )
}
