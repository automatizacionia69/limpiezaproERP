'use client'

import { useActionState, useEffect, useState } from 'react'
import { crearProducto, sugerirSku, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

type Opcion = { id: number; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'
const AYUDA = 'mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500'

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
  const [sku, setSku] = useState('')
  // Deja de auto-sugerir en cuanto el usuario toca el campo a mano — la
  // sugerencia es solo un punto de partida editable, nunca se le pisa lo
  // que ya escribió.
  const [skuTocado, setSkuTocado] = useState(false)

  useEffect(() => {
    if (skuTocado) return
    let cancelado = false
    sugerirSku(categoriaId ? Number(categoriaId) : null).then((sugerido) => {
      if (!cancelado) setSku(sugerido)
    })
    return () => {
      cancelado = true
    }
  }, [categoriaId, skuTocado])

  useEffect(() => {
    // Bajo alta concurrencia (varias personas creando en la misma categoría
    // casi al mismo tiempo) dos sugerencias de SKU pueden coincidir. Si el
    // guardado choca por SKU duplicado, se refresca la sugerencia sola en
    // vez de dejar al usuario reintentando a ciegas con el mismo valor que
    // ya falló.
    if (estado.error?.includes('SKU')) {
      setSkuTocado(false)
    }
  }, [estado.error])

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre *</label>
          <input type="text" name="nombre" required className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>SKU *</label>
          <input
            type="text"
            name="sku"
            required
            value={sku}
            onChange={(e) => {
              setSku(e.target.value)
              setSkuTocado(true)
            }}
            placeholder="Se sugiere al elegir categoría"
            className={`${CAMPO} uppercase`}
          />
          <p className={AYUDA}>Código interno único del ERP. Editable — la sugerencia es solo un punto de partida.</p>
        </div>

        <div>
          <label className={LABEL}>Código de barras</label>
          <input type="text" name="codigo_barras" inputMode="numeric" placeholder="EAN/UPC (opcional)" className={CAMPO} />
          <p className={AYUDA}>8 a 14 dígitos. Déjalo vacío si el producto no tiene uno.</p>
        </div>

        <div>
          <label className={LABEL}>Marca</label>
          <input type="text" name="marca" placeholder="Opcional" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Cód. fabricante</label>
          <input type="text" name="codigo" placeholder="Código del proveedor/fabricante (opcional)" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Tipo de afectación IGV *</label>
          <select
            name="tipo_afectacion_igv"
            required
            defaultValue={AFECTACION_IGV_DEFAULT}
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
          <p className={AYUDA}>Incluye IGV (18%).</p>
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
