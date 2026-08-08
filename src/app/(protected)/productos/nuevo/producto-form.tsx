'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { crearProducto, sugerirSku, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'
import { IGV_TASA, calcularImportes } from '@/lib/cotizaciones'

type Opcion = { id: number; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'
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
  // 'automatico': el SKU sigue la sugerencia según la categoría, campo
  // bloqueado. 'manual': el usuario escribe el suyo libremente. Cambiar de
  // categoría en modo manual NO pisa lo ya escrito.
  const [modoSku, setModoSku] = useState<'automatico' | 'manual'>('automatico')
  const [refrescarSugerencia, setRefrescarSugerencia] = useState(0)
  const [precioVenta, setPrecioVenta] = useState('')
  const marcaRef = useRef<HTMLInputElement>(null)

  // Mismo criterio que el resto del ERP: el precio ya incluye IGV, se
  // desglosa hacia atrás (ver lib/cotizaciones.ts).
  const { subtotal: precioVentaSinIgv, igv: igvPrecioVenta } = useMemo(
    () => calcularImportes([{ cantidad: 1, precio_unitario: Number(precioVenta) || 0, tipo_afectacion_igv: AFECTACION_IGV_DEFAULT }]),
    [precioVenta]
  )

  // Una pistola lectora de código de barras es, para el navegador, un
  // teclado: "escribe" los dígitos y al terminar manda un Enter. Sin esto,
  // ese Enter enviaría el formulario entero a medio llenar. Se intercepta
  // acá, se recorta espacios que algunos lectores agregan, y se pasa el
  // foco a Marca para seguir el flujo sin tocar el mouse.
  function manejarEnterEscaner(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.currentTarget.value = e.currentTarget.value.trim()
    marcaRef.current?.focus()
  }

  useEffect(() => {
    if (modoSku !== 'automatico') return
    let cancelado = false
    sugerirSku(categoriaId ? Number(categoriaId) : null).then((sugerido) => {
      if (!cancelado) setSku(sugerido)
    })
    return () => {
      cancelado = true
    }
  }, [categoriaId, modoSku, refrescarSugerencia])

  useEffect(() => {
    // Bajo alta concurrencia (varias personas creando en la misma categoría
    // casi al mismo tiempo) dos sugerencias automáticas de SKU pueden
    // coincidir. Si el guardado choca por SKU duplicado y el modo sigue en
    // automático, se refresca la sugerencia sola en vez de dejar al usuario
    // reintentando a ciegas con el mismo valor que ya falló. En modo manual
    // se deja tal cual — el usuario lo corrige él mismo.
    if (estado.error?.includes('SKU') && modoSku === 'automatico') {
      setRefrescarSugerencia((n) => n + 1)
    }
  }, [estado.error, modoSku])

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre *</label>
          <input type="text" name="nombre" required autoComplete="off" className={CAMPO} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className={LABEL}>SKU *</label>
            <div className="inline-flex rounded-lg bg-[#f1f5f9] dark:bg-slate-800 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setModoSku('automatico')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  modoSku === 'automatico'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-[#64748b] dark:text-slate-400'
                }`}
              >
                Automático
              </button>
              <button
                type="button"
                onClick={() => setModoSku('manual')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  modoSku === 'manual'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-[#64748b] dark:text-slate-400'
                }`}
              >
                Manual
              </button>
            </div>
          </div>
          <input
            type="text"
            name="sku"
            required
            autoComplete="off"
            disabled={modoSku === 'automatico'}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Se sugiere al elegir categoría"
            className={`${CAMPO} uppercase disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-70 dark:disabled:bg-slate-800/40`}
          />
          <p className={AYUDA}>
            {modoSku === 'automatico'
              ? 'Se genera solo según la categoría — pasa a "Manual" para escribir el tuyo.'
              : 'Código interno único del ERP — escríbelo tú.'}
          </p>
        </div>

        <div>
          <label className={LABEL}>Código de barras</label>
          <input
            type="text"
            name="codigo_barras"
            inputMode="numeric"
            autoComplete="off"
            onKeyDown={manejarEnterEscaner}
            placeholder="EAN/UPC (opcional) — o escanéalo aquí"
            className={CAMPO}
          />
          <p className={AYUDA}>8 a 14 dígitos. Puedes escribirlo o escanearlo con la pistola lectora.</p>
        </div>

        <div>
          <label className={LABEL}>Marca</label>
          <input ref={marcaRef} type="text" name="marca" autoComplete="off" placeholder="Opcional" className={CAMPO} />
        </div>

        <div>
          <label className={LABEL}>Cód. fabricante</label>
          <input type="text" name="codigo" autoComplete="off" placeholder="Código del proveedor/fabricante (opcional)" className={CAMPO} />
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
          <label className={LABEL}>Precio de venta</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="precio_venta"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
            className={CAMPO}
          />
          {Number(precioVenta) > 0 ? (
            <p className={AYUDA}>
              Sin IGV: S/ {precioVentaSinIgv.toFixed(2)} + IGV ({(IGV_TASA * 100).toFixed(0)}%): S/ {igvPrecioVenta.toFixed(2)}
            </p>
          ) : (
            <p className={AYUDA}>Incluye IGV (18%).</p>
          )}
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
