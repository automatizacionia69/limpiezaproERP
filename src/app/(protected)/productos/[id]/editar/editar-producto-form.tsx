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

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-sm font-bold text-[#1e293b]'

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
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={producto.id} />

      <div>
        <label className={LABEL}>Nombre *</label>
        <input type="text" name="nombre" required defaultValue={producto.nombre} className={CAMPO} />
      </div>

      <div>
        <label className={LABEL}>Código</label>
        <input type="text" name="codigo" defaultValue={producto.codigo ?? ''} className={CAMPO} />
      </div>

      <div>
        <label className={LABEL}>Unidad *</label>
        <select name="unidad_id" required defaultValue={producto.unidad_id} className={CAMPO}>
          {unidades.map((u) => (
            <option key={u.id} value={u.id} className="text-slate-900">
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Categoría</label>
        <select name="categoria_id" defaultValue={producto.categoria_id ?? ''} className={CAMPO}>
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
        <label className={LABEL}>Zona</label>
        <select name="zona_id" defaultValue={producto.zona_id ?? ''} className={CAMPO}>
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
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">
            Todavía no hay zonas creadas — este selector se llena cuando exista un módulo de Zonas.
          </p>
        )}
      </div>

      <div>
        <label className={LABEL}>Precio de venta</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="precio_venta"
          defaultValue={producto.precio_venta ?? ''}
          className={CAMPO}
        />
      </div>

      <div>
        <label className={LABEL}>Punto de reorden</label>
        <input
          type="number"
          step="1"
          min="0"
          name="punto_reorden"
          defaultValue={producto.punto_reorden ?? ''}
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
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40"
      >
        Guardar cambios
      </button>
    </form>
  )
}
