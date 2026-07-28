'use client'

import { useActionState } from 'react'
import { crearProducto, type EstadoFormulario } from '../actions'

type Opcion = { id: number; nombre: string }

export function ProductoForm({
  unidades,
  categorias,
}: {
  unidades: Opcion[]
  categorias: Opcion[]
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearProducto, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre *</label>
        <input
          type="text"
          name="nombre"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Código</label>
        <input
          type="text"
          name="codigo"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Unidad *</label>
        <select
          name="unidad_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="" disabled className="text-slate-900">
            Selecciona una unidad
          </option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id} className="text-slate-900">
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Categoría</label>
        <select
          name="categoria_id"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="" className="text-slate-900">
            Sin categoría
          </option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id} className="text-slate-900">
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Precio de venta</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="precio_venta"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Punto de reorden</label>
        <input
          type="number"
          step="1"
          min="0"
          name="punto_reorden"
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
        Guardar producto
      </button>
    </form>
  )
}
