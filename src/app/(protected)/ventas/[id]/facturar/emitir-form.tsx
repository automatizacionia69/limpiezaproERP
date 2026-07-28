'use client'

import { useActionState, useState } from 'react'
import { emitirComprobante, type EstadoFormulario } from '../../actions'

type TipoComprobante = 'factura' | 'boleta' | 'nota_venta'

const OPCIONES: { tipo: TipoComprobante; emoji: string; titulo: string; descripcion: string }[] = [
  { tipo: 'factura', emoji: '🧾', titulo: 'Factura', descripcion: 'Requiere que el cliente tenga RUC (11 dígitos).' },
  { tipo: 'boleta', emoji: '🧻', titulo: 'Boleta', descripcion: 'Para clientes con DNI o sin documento.' },
  { tipo: 'nota_venta', emoji: '📄', titulo: 'Nota de venta', descripcion: 'Comprobante interno, sin validez tributaria.' },
]

export function EmitirComprobanteForm({ ordenId, tieneRuc }: { ordenId: number; tieneRuc: boolean }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(emitirComprobante, { error: null })
  const [tipo, setTipo] = useState<TipoComprobante>(tieneRuc ? 'factura' : 'boleta')

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="orden_id" value={ordenId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <label className="block text-sm font-bold text-[#1e293b]">Tipo de comprobante *</label>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPCIONES.map((o) => {
            const deshabilitado = o.tipo === 'factura' && !tieneRuc
            return (
              <button
                key={o.tipo}
                type="button"
                disabled={deshabilitado}
                onClick={() => setTipo(o.tipo)}
                className={`rounded-2xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  tipo === o.tipo
                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                    : 'border-[#e2e8f0] bg-white hover:border-teal-200'
                }`}
              >
                <div className="text-2xl">{o.emoji}</div>
                <p className="mt-2 text-sm font-bold text-[#1e293b]">{o.titulo}</p>
                <p className="mt-1 text-xs text-[#64748b]">{o.descripcion}</p>
              </button>
            )
          })}
        </div>
        {!tieneRuc && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            Este cliente no tiene RUC registrado, por eso Factura está deshabilitada.
          </p>
        )}
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40"
      >
        Emitir comprobante y descontar stock
      </button>
    </form>
  )
}
