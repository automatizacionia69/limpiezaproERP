'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/modal'
import { Buscador } from '@/components/buscador'
import { sugerirSku } from '../../productos/actions'
import { crearProductoDesdeCompra, type ProductoCreado } from './crear-producto-rapido'
import { IGV_TASA, calcularImportes } from '@/lib/cotizaciones'
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

type Opcion = { id: number; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

/**
 * Alta rápida de producto sin salir de la compra en curso. Misma validación
 * y mismos campos que Productos → Nuevo (vía crearProductoDesdeCompra), pero
 * como modal: al guardar, el producto queda disponible y seleccionado en la
 * línea de la compra que abrió este modal, sin perder lo ya llenado en el
 * resto del formulario de compra.
 */
export function CrearProductoModal({
  abierto,
  nombreInicial,
  unidades,
  categorias,
  onCreado,
  onCerrar,
}: {
  abierto: boolean
  nombreInicial: string
  unidades: Opcion[]
  categorias: Opcion[]
  onCreado: (producto: ProductoCreado, costoUnitario: number | null) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [sku, setSku] = useState('')
  const [skuTocado, setSkuTocado] = useState(false)
  const [codigoBarras, setCodigoBarras] = useState('')
  const [marca, setMarca] = useState('')
  const [unidadId, setUnidadId] = useState<number | ''>('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [puntoReorden, setPuntoReorden] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const marcaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!abierto) return
    setNombre(nombreInicial)
    setSku('')
    setSkuTocado(false)
    setCodigoBarras('')
    setMarca('')
    setUnidadId('')
    setCategoriaId('')
    setPrecioCompra('')
    setPuntoReorden('')
    setGuardando(false)
    setError(null)
  }, [abierto, nombreInicial])

  useEffect(() => {
    if (!abierto || skuTocado) return
    let cancelado = false
    sugerirSku(categoriaId ? Number(categoriaId) : null).then((sugerido) => {
      if (!cancelado) setSku(sugerido)
    })
    return () => {
      cancelado = true
    }
  }, [abierto, categoriaId, skuTocado])

  function manejarEnterEscaner(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.currentTarget.value = e.currentTarget.value.trim()
    marcaRef.current?.focus()
  }

  // Mismo criterio que el resto del ERP (ver lib/cotizaciones.ts): el precio
  // que escribe el usuario ya incluye IGV, y el desglose se calcula hacia
  // atrás — nunca se suma el IGV encima.
  const { subtotal: precioSinIgv, igv: igvCalculado } = useMemo(
    () => calcularImportes([{ cantidad: 1, precio_unitario: Number(precioCompra) || 0, tipo_afectacion_igv: AFECTACION_IGV_DEFAULT }]),
    [precioCompra]
  )

  async function guardar() {
    setGuardando(true)
    setError(null)

    const resultado = await crearProductoDesdeCompra({
      nombre,
      sku,
      codigoBarras,
      marca,
      unidadId,
      categoriaId,
      puntoReorden,
    })

    setGuardando(false)

    if ('error' in resultado) {
      if (resultado.error.includes('SKU')) setSkuTocado(false)
      setError(resultado.error)
      return
    }

    onCreado(resultado.producto, precioCompra ? Number(precioCompra) : null)
  }

  return (
    <Modal abierto={abierto} onClose={onCerrar} className="max-w-2xl">
      <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">+ Crear producto nuevo</h2>
      <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
        Se guarda en el catálogo maestro de Productos, igual que si lo crearas desde ese módulo. La compra que
        estás llenando no se pierde.
      </p>

      {/* div, no <form>: este modal se renderiza dentro del <form> de la compra —
          un <form> anidado es HTML inválido y el navegador descarta el interno
          al parsear. Los campos son controlados, no dependen de submit nativo. */}
      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre *</label>
            <input
              type="text"
              required
              autoComplete="off"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div>
            <label className={LABEL}>SKU *</label>
            <input
              type="text"
              required
              autoComplete="off"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value)
                setSkuTocado(true)
              }}
              placeholder="Se sugiere al elegir categoría"
              className={`${CAMPO} uppercase`}
            />
          </div>

          <div>
            <label className={LABEL}>Código de barras</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={manejarEnterEscaner}
              placeholder="EAN/UPC (opcional) — o escanéalo aquí"
              className={CAMPO}
            />
          </div>

          <div>
            <label className={LABEL}>Marca</label>
            <input
              ref={marcaRef}
              type="text"
              autoComplete="off"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Opcional"
              className={CAMPO}
            />
          </div>

          <div>
            <label className={LABEL}>Unidad *</label>
            <div className="mt-1.5">
              <Buscador
                opciones={unidades}
                valor={unidadId}
                onChange={(id) => setUnidadId(Number(id) || '')}
                placeholder="Elige una unidad..."
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
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Precio de compra</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Incluye IGV"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              className={CAMPO}
            />
            {Number(precioCompra) > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
                Sin IGV: S/ {precioSinIgv.toFixed(2)} + IGV ({(IGV_TASA * 100).toFixed(0)}%): S/ {igvCalculado.toFixed(2)}
              </p>
            )}
            <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              Se usa para precargar el costo unitario en la línea de la compra — no es el precio de venta (ese se
              define después, en Productos).
            </p>
          </div>

          <div>
            <label className={LABEL}>Stock mínimo (punto de reorden)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={puntoReorden}
              onChange={(e) => setPuntoReorden(e.target.value)}
              className={CAMPO}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 py-3 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex-1 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
