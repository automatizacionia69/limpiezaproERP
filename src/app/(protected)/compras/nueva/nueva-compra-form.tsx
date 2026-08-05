'use client'

import { useActionState, useMemo, useState } from 'react'
import { crearOrdenCompra, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'
import { SubirDocumentoCompra } from './subir-documento-compra'
import type { DatosExtraidos } from './analizar-documento'
import { crearProductoRapido } from './crear-producto-rapido'
import { IGV_TASA, calcularImportes } from '@/lib/cotizaciones'

type Proveedor = { id: number; nombre: string }
type Producto = { id: number; nombre: string }
type Linea = {
  producto_id: number | ''
  cantidad: number | ''
  costo_unitario: number | ''
  nombreSugerido?: string
}

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', costo_unitario: '' }
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function buscarProductoCoincidente(nombre: string, productos: Producto[]): Producto | null {
  const buscado = normalizar(nombre)
  if (!buscado) return null

  const exacto = productos.find((p) => normalizar(p.nombre) === buscado)
  if (exacto) return exacto

  const parcial = productos.find((p) => {
    const n = normalizar(p.nombre)
    return n.includes(buscado) || buscado.includes(n)
  })
  return parcial ?? null
}

const TIPOS_DOCUMENTO = [
  { valor: 'factura', label: 'Factura' },
  { valor: 'boleta', label: 'Boleta' },
  { valor: 'guia_remision', label: 'Guía de remisión' },
] as const

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function NuevaCompraForm({
  proveedores,
  productos,
}: {
  proveedores: Proveedor[]
  productos: Producto[]
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearOrdenCompra, {
    error: null,
  })
  const [proveedorId, setProveedorId] = useState<number | ''>('')
  const [fechaRegistro, setFechaRegistro] = useState(hoyISO())
  const [tipoDocumento, setTipoDocumento] = useState<(typeof TIPOS_DOCUMENTO)[number]['valor']>('factura')
  const [documentoSerie, setDocumentoSerie] = useState('')
  const [documentoNumero, setDocumentoNumero] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()])
  const [totalDetectadoIA, setTotalDetectadoIA] = useState<number | null>(null)
  const [catalogo, setCatalogo] = useState<Producto[]>(productos)
  const [productosCreados, setProductosCreados] = useState<string[]>([])

  async function aplicarExtraccion(datos: DatosExtraidos) {
    if (datos.tipo_documento) setTipoDocumento(datos.tipo_documento)
    if (datos.serie) setDocumentoSerie(datos.serie)
    if (datos.numero) setDocumentoNumero(datos.numero)
    if (datos.fecha) setFechaRegistro(datos.fecha)
    setTotalDetectadoIA(datos.total)

    if (datos.productos.length === 0) return

    setProductosCreados([])
    const nuevosCreados: string[] = []

    const nuevasLineas = await Promise.all(
      datos.productos.map(async (p): Promise<Linea> => {
        const coincidencia = buscarProductoCoincidente(p.nombre, catalogo)
        if (coincidencia) {
          return { producto_id: coincidencia.id, cantidad: p.cantidad, costo_unitario: p.precio_unitario }
        }

        // No hay match en el catalogo: se crea el producto tal cual lo leyo
        // la IA (nombre y costo de compra) para no frenar el flujo — por eso
        // el aviso fijo de "revisa manualmente" sigue visible en todo momento.
        const resultado = await crearProductoRapido(p.nombre, p.precio_unitario)
        if ('producto' in resultado) {
          setCatalogo((prev) => [...prev, resultado.producto])
          nuevosCreados.push(resultado.producto.nombre)
          return { producto_id: resultado.producto.id, cantidad: p.cantidad, costo_unitario: p.precio_unitario }
        }

        return {
          producto_id: '',
          cantidad: p.cantidad,
          costo_unitario: p.precio_unitario,
          nombreSugerido: p.nombre,
        }
      })
    )

    setLineas(nuevasLineas)
    setProductosCreados(nuevosCreados)
  }

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor === '' ? '' : Number(valor) } : l))
    )
  }

  function actualizarProductoLinea(i: number, productoId: number | string | '') {
    setLineas((prev) =>
      prev.map((l, idx) =>
        idx === i ? { ...l, producto_id: Number(productoId) || '', nombreSugerido: undefined } : l
      )
    )
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()])
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  // Mismo calculo que Cotizaciones/Ventas/Notas de credito (calcularImportes):
  // costo_unitario ya incluye IGV, se desglosa hacia atras.
  const { subtotal, igv, total } = useMemo(
    () =>
      calcularImportes(
        lineas.map((l) => ({
          cantidad: Number(l.cantidad) || 0,
          precio_unitario: Number(l.costo_unitario) || 0,
        }))
      ),
    [lineas]
  )

  const hayLineasSinResolver = lineas.some((l) => l.nombreSugerido && !l.producto_id)

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({
        producto_id: Number(l.producto_id),
        cantidad: Number(l.cantidad),
        costo_unitario: Number(l.costo_unitario) || 0,
      }))
  )

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="lineas" value={lineasJson} />

      <SubirDocumentoCompra onExtraido={aplicarExtraccion} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Proveedor *</label>
          <div className="mt-1.5">
            <Buscador
              opciones={proveedores}
              valor={proveedorId}
              onChange={(id) => setProveedorId(Number(id) || '')}
              placeholder="Escribe el nombre del proveedor..."
              name="proveedor_id"
              required
            />
          </div>
        </div>
        <div>
          <label className={LABEL}>Fecha de registro *</label>
          <input
            type="date"
            name="fecha_registro"
            required
            value={fechaRegistro}
            onChange={(e) => setFechaRegistro(e.target.value)}
            className={CAMPO}
          />
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 p-5">
        <label className={LABEL}>Documento del proveedor *</label>
        <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Todo ingreso debe respaldarse con Factura, Boleta o Guía de remisión del proveedor.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Tipo *</label>
            <select
              name="tipo_documento"
              required
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as (typeof TIPOS_DOCUMENTO)[number]['valor'])}
              className={CAMPO}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor} className="text-[#1e293b] dark:text-slate-100">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Serie *</label>
            <input
              type="text"
              name="documento_serie"
              required
              placeholder="F001"
              value={documentoSerie}
              onChange={(e) => setDocumentoSerie(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Número *</label>
            <input
              type="text"
              name="documento_numero"
              required
              placeholder="000123"
              value={documentoNumero}
              onChange={(e) => setDocumentoNumero(e.target.value)}
              className={CAMPO}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL}>Observación</label>
        <input type="text" name="observacion" className={CAMPO} />
      </div>

      <div className="rounded-2xl bg-[#fdf2f8] dark:bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <label className={LABEL}>Productos *</label>
          <button
            type="button"
            onClick={agregarLinea}
            className="rounded-full bg-pink-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-pink-500/30 transition-all hover:bg-pink-600"
          >
            + Agregar línea
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Buscador
                  opciones={catalogo}
                  valor={l.producto_id}
                  onChange={(id) => actualizarProductoLinea(i, id)}
                  placeholder={
                    l.nombreSugerido
                      ? `IA leyó: "${l.nombreSugerido}" — selecciona el producto`
                      : 'Buscar producto...'
                  }
                />
              </div>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Cant."
                value={l.cantidad}
                onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-pink-500"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo"
                value={l.costo_unitario}
                onChange={(e) => actualizarLinea(i, 'costo_unitario', e.target.value)}
                className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-pink-500"
              />
              <span className="w-24 shrink-0 text-right text-sm font-bold text-[#1e293b] dark:text-slate-100">
                S/ {((Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0)).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => quitarLinea(i)}
                disabled={lineas.length === 1}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141a2e] text-[#64748b] dark:text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                title="Quitar línea"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t-2 border-pink-100 pt-3 text-right">
          <p className="text-sm text-[#64748b] dark:text-slate-400">
            Subtotal (sin IGV): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {subtotal.toFixed(2)}</span>
          </p>
          <p className="text-sm text-[#64748b] dark:text-slate-400">
            IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {igv.toFixed(2)}</span>
          </p>
          <p className="text-xl font-extrabold text-pink-600">Total: S/ {total.toFixed(2)}</p>
        </div>
        {totalDetectadoIA !== null && Math.abs(totalDetectadoIA - total) > 0.01 && (
          <p className="mt-1 text-right text-xs font-bold text-amber-600">
            ⚠️ La IA leyó un total de S/ {totalDetectadoIA.toFixed(2)} — no coincide con la suma de las líneas,
            revisa cantidades y precios.
          </p>
        )}
      </div>

      {productosCreados.length > 0 && (
        <p className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-500">
          ⚠️ La IA creó automáticamente estos productos nuevos en el catálogo (revisa nombre, unidad y precio de
          venta): {productosCreados.join(', ')}.
        </p>
      )}

      {hayLineasSinResolver && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Hay productos leídos por la IA sin seleccionar en el catálogo — elige el producto correcto o
          quita esa línea antes de guardar.
        </p>
      )}

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={hayLineasSinResolver}
        className="w-full rounded-md bg-gradient-to-r from-pink-500 to-rose-500 py-3.5 text-base font-bold text-white shadow-lg shadow-pink-500/30 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Guardar orden (pendiente)
      </button>
      <p className="text-center text-xs font-medium text-[#94a3b8] dark:text-slate-500">
        La orden se guarda como "pendiente" — el stock recién se actualiza cuando la marques como
        "Recibida" desde la lista.
      </p>
    </form>
  )
}
