'use client'

import { useActionState } from 'react'
import { crearNotaDebito, type EstadoFormulario } from '../actions'
import { MOTIVOS_NOTA_DEBITO } from '@/lib/motivos'

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

export function NotaDebitoForm({ comprobanteId }: { comprobanteId: number }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearNotaDebito, { error: null })

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="comprobante_id" value={comprobanteId} />

      <div>
        <label className={LABEL}>Motivo *</label>
        <select name="motivo" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            Selecciona un motivo
          </option>
          {MOTIVOS_NOTA_DEBITO.map((m) => (
            <option key={m.codigo} value={m.label}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Monto (S/) *</label>
        <input type="number" name="monto" required min="0.01" step="0.01" placeholder="0.00" className={CAMPO} />
      </div>

      <div>
        <label className={LABEL}>Observación</label>
        <input type="text" name="observacion" placeholder="Detalle opcional" className={CAMPO} />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-amber-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-500/30 transition-all hover:bg-amber-600 active:scale-95"
      >
        Emitir nota de débito
      </button>
    </form>
  )
}
