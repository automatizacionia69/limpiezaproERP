'use client'

import { useActionState, useState } from 'react'
import { registrarMovimiento, type EstadoFormulario } from './actions'

type Producto = { id: number; nombre: string }

const CANTIDAD_LABEL: Record<string, string> = {
  entrada: 'Cantidad que entró',
  salida: 'Cantidad que salió',
  ajuste: 'Cantidad real (conteo físico)',
}

const TIPOS = [
  { valor: 'entrada', label: 'Entrada', emoji: '📥', activo: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' },
  { valor: 'salida', label: 'Salida', emoji: '📤', activo: 'bg-red-500 text-white shadow-md shadow-red-500/30' },
  { valor: 'ajuste', label: 'Ajuste', emoji: '⚖️', activo: 'bg-amber-500 text-white shadow-md shadow-amber-500/30' },
]

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
const LABEL = 'block text-sm font-bold text-[#1e293b]'

export function MovimientoForm({ productos }: { productos: Producto[] }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(registrarMovimiento, {
    error: null,
  })
  const [tipo, setTipo] = useState('entrada')

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <label className={LABEL}>Tipo de movimiento *</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipo(t.valor)}
              className={`rounded-xl py-3 text-sm font-bold transition-all ${
                tipo === t.valor ? t.activo : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
              }`}
            >
              <div className="text-lg">{t.emoji}</div>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>Producto *</label>
        <select name="producto_id" required defaultValue="" className={CAMPO}>
          <option value="" disabled className="text-slate-900">
            Selecciona un producto
          </option>
          {productos.map((p) => (
            <option key={p.id} value={p.id} className="text-slate-900">
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>{CANTIDAD_LABEL[tipo]} *</label>
        <input type="number" step="0.01" min="0" name="cantidad" required className={CAMPO} />
        {tipo === 'ajuste' && (
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">
            Es el total real contado, no la diferencia — el sistema calcula el ajuste solo.
          </p>
        )}
      </div>

      {tipo === 'entrada' && (
        <div>
          <label className={LABEL}>Costo unitario *</label>
          <input type="number" step="0.01" min="0" name="costo_unitario" required className={CAMPO} />
        </div>
      )}

      <div>
        <label className={LABEL}>Motivo</label>
        <input
          type="text"
          name="motivo"
          placeholder="ej. compra proveedor, venta, merma"
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
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/40"
      >
        Registrar movimiento
      </button>
    </form>
  )
}
