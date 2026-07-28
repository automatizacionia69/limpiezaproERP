'use client'

import { useActionState, useMemo, useState } from 'react'
import { crearOrdenCompra, type EstadoFormulario } from '../actions'

type Proveedor = { id: number; nombre: string }
type Producto = { id: number; nombre: string }
type Linea = { producto_id: number | ''; cantidad: number | ''; costo_unitario: number | '' }

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', costo_unitario: '' }
}

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
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()])

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) =>
      prev.map((l, idx) =>
        idx === i
          ? { ...l, [campo]: campo === 'producto_id' ? Number(valor) || '' : valor === '' ? '' : Number(valor) }
          : l
      )
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
      lineas.reduce(
        (acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0),
        0
      ),
    [lineas]
  )

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
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="lineas" value={lineasJson} />

      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Proveedor *</label>
        <select
          name="proveedor_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        >
          <option value="" disabled className="text-[#1e293b]">
            Selecciona un proveedor
          </option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id} className="text-[#1e293b]">
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Observación</label>
        <input
          type="text"
          name="observacion"
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[#1e293b]">Productos *</label>
          <button
            type="button"
            onClick={agregarLinea}
            className="text-[13px] font-medium text-[#4f46e5] hover:underline"
          >
            + Agregar línea
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={l.producto_id}
                onChange={(e) => actualizarLinea(i, 'producto_id', e.target.value)}
                className="flex-1 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
              >
                <option value="" className="text-[#1e293b]">
                  Producto...
                </option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id} className="text-[#1e293b]">
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Cant."
                value={l.cantidad}
                onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                className="w-24 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo"
                value={l.costo_unitario}
                onChange={(e) => actualizarLinea(i, 'costo_unitario', e.target.value)}
                className="w-24 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
              />
              <button
                type="button"
                onClick={() => quitarLinea(i)}
                disabled={lineas.length === 1}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748b] hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                title="Quitar línea"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end text-sm">
          <span className="text-[#64748b]">Total: </span>
          <span className="ml-1 font-semibold text-[#1e293b]">S/ {total.toFixed(2)}</span>
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-[#4f46e5] py-2.5 text-sm font-semibold text-white hover:bg-[#4338ca]"
      >
        Guardar orden (pendiente)
      </button>
      <p className="text-center text-xs text-[#64748b]">
        La orden se guarda como "pendiente" — el stock recién se actualiza cuando la marques como
        "Recibida" desde la lista.
      </p>
    </form>
  )
}
