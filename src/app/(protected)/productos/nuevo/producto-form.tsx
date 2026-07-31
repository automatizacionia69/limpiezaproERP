'use client'

import { useActionState, useState } from 'react'
import { crearProducto, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'

type Opcion = { id: number; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

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
  const [unidadId, setUnidadId] = useState<number | ''>('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre *</label>
          <input type="text" name="nombre" required className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Código</label>
          <input type="text" name="codigo" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Unidad *</label>
          <div className="mt-1.5">
            <Buscador
              opciones={unidades}
              valor={unidadId}
              onChange={(id) => setUnidadId(Number(id) || '')}
              placeholder="Escribe para buscar una unidad..."
              name="unidad_id"
              required
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Categoría</label>
          <div className="mt-1.5">
            <Buscador
              opciones={categorias}
              valor={categoriaId}
              onChange={(id) => setCategoriaId(Number(id) || '')}
              placeholder="Sin categoría (opcional)"
              name="categoria_id"
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Precio de venta</label>
          <input type="number" step="0.01" min="0" name="precio_venta" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Stock mínimo (punto de reorden)</label>
          <input type="number" step="1" min="0" name="punto_reorden" className={CAMPO} />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
      >
        Guardar producto
      </button>
    </form>
  )
}
