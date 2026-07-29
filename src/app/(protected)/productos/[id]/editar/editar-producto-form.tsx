'use client'

import { useActionState, useState } from 'react'
import { editarProducto } from '../../actions'
import type { EstadoFormulario } from '../../actions'
import { Buscador } from '@/components/buscador'

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
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

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
  const [unidadId, setUnidadId] = useState<number | ''>(producto.unidad_id)
  const [categoriaId, setCategoriaId] = useState<number | ''>(producto.categoria_id ?? '')
  const [zonaId, setZonaId] = useState<number | ''>(producto.zona_id ?? '')

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={producto.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre *</label>
          <input type="text" name="nombre" required defaultValue={producto.nombre} className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Código</label>
          <input type="text" name="codigo" defaultValue={producto.codigo ?? ''} className={CAMPO} />
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
          <label className={LABEL}>Zona</label>
          <div className="mt-1.5">
            <Buscador
              opciones={zonas}
              valor={zonaId}
              onChange={(id) => setZonaId(Number(id) || '')}
              placeholder="Sin zona (opcional)"
              name="zona_id"
              disabled={zonas.length === 0}
            />
          </div>
          {zonas.length === 0 && (
            <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
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
          <label className={LABEL}>Stock mínimo (punto de reorden)</label>
          <input
            type="number"
            step="1"
            min="0"
            name="punto_reorden"
            defaultValue={producto.punto_reorden ?? ''}
            className={CAMPO}
          />
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
            Cuando el stock caiga a este nivel o menos, el producto aparece en la alerta de stock bajo.
          </p>
        </div>
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
