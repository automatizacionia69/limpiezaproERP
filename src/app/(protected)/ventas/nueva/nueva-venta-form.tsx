'use client'

import { useActionState, useMemo, useState } from 'react'
import { crearOrdenVenta, type EstadoFormulario } from '../actions'
import { Buscador } from '@/components/buscador'

type Cliente = { id: number; nombre: string }
type Producto = { id: number; nombre: string; cantidad: number; precio_venta: number | null }
type Linea = { producto_id: number | ''; cantidad: number | ''; precio_unitario: number | '' }

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', precio_unitario: '' }
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
const LABEL = 'block text-sm font-bold text-[#1e293b]'

export function NuevaVentaForm({
  clientes,
  productos,
}: {
  clientes: Cliente[]
  productos: Producto[]
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearOrdenVenta, {
    error: null,
  })
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()])

  const opcionesProductos = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: p.nombre, subtitulo: `stock: ${p.cantidad}` })),
    [productos]
  )

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor === '' ? '' : Number(valor) } : l))
    )
  }

  function actualizarProductoLinea(i: number, productoId: number | string | '') {
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        const producto = productos.find((p) => p.id === Number(productoId))
        return {
          ...l,
          producto_id: Number(productoId) || '',
          precio_unitario: producto?.precio_venta ?? l.precio_unitario,
        }
      })
    )
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()])
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  const total = useMemo(
    () =>
      lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0),
    [lineas]
  )

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.producto_id && l.cantidad)
      .map((l) => ({
        producto_id: Number(l.producto_id),
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario) || 0,
      }))
  )

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="lineas" value={lineasJson} />

      <div>
        <label className={LABEL}>Cliente *</label>
        <div className="mt-1.5">
          <Buscador
            opciones={clientes}
            valor={clienteId}
            onChange={(id) => setClienteId(Number(id) || '')}
            placeholder="Escribe el nombre del cliente..."
            name="cliente_id"
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Observación</label>
        <input type="text" name="observacion" className={CAMPO} />
      </div>

      <div className="rounded-2xl bg-teal-50 p-5">
        <div className="flex items-center justify-between">
          <label className={LABEL}>Productos *</label>
          <button
            type="button"
            onClick={agregarLinea}
            className="rounded-full bg-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-teal-500/30 transition-all hover:bg-teal-600"
          >
            + Agregar línea
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {lineas.map((l, i) => {
            const producto = productos.find((p) => p.id === l.producto_id)
            const excedeStock = producto && Number(l.cantidad) > producto.cantidad
            return (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Buscador
                      opciones={opcionesProductos}
                      valor={l.producto_id}
                      onChange={(id) => actualizarProductoLinea(i, id)}
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Cant."
                    value={l.cantidad}
                    onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                    className="w-24 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-teal-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio"
                    value={l.precio_unitario}
                    onChange={(e) => actualizarLinea(i, 'precio_unitario', e.target.value)}
                    className="w-24 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => quitarLinea(i)}
                    disabled={lineas.length === 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#64748b] transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                    title="Quitar línea"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {excedeStock && (
                  <p className="mt-1 ml-1 text-xs font-medium text-amber-600">
                    ⚠️ Solo hay {producto!.cantidad} en stock — al facturar, esta línea dejará el stock en
                    negativo ({(producto!.cantidad - Number(l.cantidad)).toFixed(2)}).
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t-2 border-teal-100 pt-3">
          <span className="text-sm font-medium text-[#64748b]">Total:</span>
          <span className="text-xl font-extrabold text-teal-600">S/ {total.toFixed(2)}</span>
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40"
      >
        Guardar orden (pendiente)
      </button>
      <p className="text-center text-xs font-medium text-[#94a3b8]">
        La orden se guarda como "pendiente" — el stock recién se descuenta cuando la marques como
        "Facturada" desde la lista.
      </p>
    </form>
  )
}
