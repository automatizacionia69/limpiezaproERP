'use client'

import { useActionState, useRef, useState } from 'react'
import { editarProducto } from '../../actions'
import type { EstadoFormulario } from '../../actions'
import { Buscador } from '@/components/buscador'
import { AFECTACIONES_IGV } from '@/lib/afectacion-igv'

type Opcion = { id: number; nombre: string }

type Producto = {
  id: number
  nombre: string
  codigo: string | null
  sku: string
  codigo_barras: string | null
  marca: string | null
  unidad_id: number
  categoria_id: number | null
  zona_id: number | null
  precio_venta: number | null
  punto_reorden: number | null
  tipo_afectacion_igv: string
}

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

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
  const marcaRef = useRef<HTMLInputElement>(null)

  // Ver el mismo comentario en producto-form.tsx: una pistola lectora manda
  // un Enter al terminar de escanear, que sin esto enviaría el formulario.
  function manejarEnterEscaner(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.currentTarget.value = e.currentTarget.value.trim()
    marcaRef.current?.focus()
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={producto.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre *</label>
          <input type="text" name="nombre" required autoComplete="off" defaultValue={producto.nombre} className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>SKU *</label>
          <input
            type="text"
            name="sku"
            required
            autoComplete="off"
            defaultValue={producto.sku}
            className={`${CAMPO} uppercase`}
          />
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
            Código interno único del ERP.
          </p>
        </div>

        <div>
          <label className={LABEL}>Código de barras</label>
          <input
            type="text"
            name="codigo_barras"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={producto.codigo_barras ?? ''}
            onKeyDown={manejarEnterEscaner}
            placeholder="EAN/UPC (opcional) — o escanéalo aquí"
            className={CAMPO}
          />
        </div>

        <div>
          <label className={LABEL}>Marca</label>
          <input ref={marcaRef} type="text" name="marca" autoComplete="off" defaultValue={producto.marca ?? ''} placeholder="Opcional" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Cód. fabricante</label>
          <input
            type="text"
            name="codigo"
            autoComplete="off"
            defaultValue={producto.codigo ?? ''}
            placeholder="Código del proveedor/fabricante (opcional)"
            className={CAMPO}
          />
        </div>

        <div>
          <label className={LABEL}>Tipo de afectación IGV *</label>
          <select
            name="tipo_afectacion_igv"
            required
            defaultValue={producto.tipo_afectacion_igv}
            className={CAMPO}
          >
            {AFECTACIONES_IGV.map((a) => (
              <option key={a.codigo} value={a.codigo} className="text-[#1e293b] dark:text-slate-100">
                {a.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Unidad *</label>
          <div className="mt-1.5">
            <Buscador
              opciones={unidades}
              valor={unidadId}
              onChange={(id) => setUnidadId(Number(id) || '')}
              placeholder="Elige una unidad..."
              name="unidad_id"
              required
              mostrarTodo
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
        className="w-full rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
      >
        Guardar cambios
      </button>
    </form>
  )
}
