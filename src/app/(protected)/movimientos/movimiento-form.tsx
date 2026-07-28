'use client'

import { useActionState, useState } from 'react'
import { registrarMovimiento, type EstadoFormulario } from './actions'

type Producto = { id: number; nombre: string }

const CANTIDAD_LABEL: Record<string, string> = {
  entrada: 'Cantidad que entró',
  salida: 'Cantidad que salió',
  ajuste: 'Cantidad real (conteo físico)',
}

export function MovimientoForm({ productos }: { productos: Producto[] }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(registrarMovimiento, {
    error: null,
  })
  const [tipo, setTipo] = useState('entrada')

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Tipo de movimiento *</label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="entrada" className="text-slate-900">
            Entrada
          </option>
          <option value="salida" className="text-slate-900">
            Salida
          </option>
          <option value="ajuste" className="text-slate-900">
            Ajuste (conteo físico)
          </option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Producto *</label>
        <select
          name="producto_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
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
        <label className="block text-sm font-medium text-slate-700">
          {CANTIDAD_LABEL[tipo]} *
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="cantidad"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
        {tipo === 'ajuste' && (
          <p className="mt-1 text-xs text-slate-500">
            Es el total real contado, no la diferencia — el sistema calcula el ajuste solo.
          </p>
        )}
      </div>

      {tipo === 'entrada' && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Costo unitario *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="costo_unitario"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Motivo</label>
        <input
          type="text"
          name="motivo"
          placeholder="ej. compra proveedor, venta, merma"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
      >
        Registrar movimiento
      </button>
    </form>
  )
}
