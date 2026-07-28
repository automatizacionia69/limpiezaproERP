'use client'

import { useActionState } from 'react'
import { anularComprobante, type EstadoFormulario } from '../actions'
import { MOTIVOS_NOTA_CREDITO } from '@/lib/motivos'

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#1e293b] outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-100'
const LABEL = 'block text-xs font-bold text-[#1e293b]'

export function AnularComprobanteForm({ comprobanteId }: { comprobanteId: number }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(anularComprobante, { error: null })

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="comprobante_id" value={comprobanteId} />

      <div>
        <label className={LABEL}>Motivo *</label>
        <select name="motivo" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            Selecciona un motivo
          </option>
          {MOTIVOS_NOTA_CREDITO.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.label} {m.anula ? '(anula la operación)' : ''}
            </option>
          ))}
        </select>
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
        className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-500/30 transition-all hover:bg-red-600"
      >
        Emitir nota de crédito
      </button>
    </form>
  )
}
