'use client'

import { useActionState } from 'react'
import { editarProducto } from '../../actions'
import type { EstadoFormulario } from '../../actions'

type Opcion = { id: number; nombre: string }

type Producto = {
  id: number
  nombre: string
  codigo: string | null
  unidad_id: number
  categoria_id: number | null
  zona_id: number | null
  precio_venta: number | null
  punto_reorden: number | null
}

export function EditarProductoForm({
  producto,
  unidades,
  categorias,
  zonas,
}: {
  producto: Producto
  unidades: Opcion[]
  categorias: Opcion[]
  zonas: Opcion[]
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarProducto, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="id" value={producto.id} />

      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre *</label>
        <input
          type="text"
          name="nombre"
          required
          defaultValue={producto.nombre}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Código</label>
        <input
          type="text"
          name="codigo"
          defaultValue={producto.codigo ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Unidad *</label>
        <select
          name="unidad_id"
          required
          defaultValue={producto.unidad_id}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
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
          defaultValue={producto.categoria_id ?? ''}
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
        <label className="block text-sm font-medium text-slate-700">Zona</label>
        <select
          name="zona_id"
          defaultValue={producto.zona_id ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="" className="text-slate-900">
            Sin zona
          </option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id} className="text-slate-900">
              {z.nombre}
            </option>
          ))}
        </select>
        {zonas.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Todavía no hay zonas creadas — este selector se llena cuando exista un módulo de Zonas.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Precio de venta</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="precio_venta"
          defaultValue={producto.precio_venta ?? ''}
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
          defaultValue={producto.punto_reorden ?? ''}
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
        Guardar cambios
      </button>
    </form>
  )
}
