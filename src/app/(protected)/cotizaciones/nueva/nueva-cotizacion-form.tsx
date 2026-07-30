'use client'

import { useActionState, useMemo, useState } from 'react'
import { crearCotizacion, type EstadoFormulario } from '../actions'
import { IGV_TASA, calcularImportes } from '@/lib/cotizaciones'
import { Buscador } from '@/components/buscador'

type Cliente = { id: number; nombre: string; documento: string | null; vendedor_id: string | null }
type Producto = { id: number; nombre: string; cantidad: number; precio_venta: number | null }
type Vendedor = { id: string; nombre: string }
type Linea = { producto_id: number | ''; cantidad: number | ''; precio_unitario: number | '' }

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', precio_unitario: '' }
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const DIAS_CREDITO = ['Contado', '7 días', '15 días', '30 días', '45 días', '60 días']
const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Yape', 'Plin']

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function NuevaCotizacionForm({
  clientes,
  productos,
  vendedores,
  usuarioActualId,
  empresa,
}: {
  clientes: Cliente[]
  productos: Producto[]
  vendedores: Vendedor[]
  usuarioActualId: string
  empresa: string
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearCotizacion, {
    error: null,
  })

  const [clienteId, setClienteId] = useState<number | ''>('')
  const [fecha, setFecha] = useState(hoyISO())
  const [diasCredito, setDiasCredito] = useState('Contado')
  const [medioPago, setMedioPago] = useState('Transferencia')
  const [vendedorId, setVendedorId] = useState(usuarioActualId)
  const [observacion, setObservacion] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()])

  function seleccionarCliente(id: number | string | '') {
    const nuevoId = Number(id) || ''
    setClienteId(nuevoId)
    const cliente = clientes.find((c) => c.id === nuevoId)
    if (cliente?.vendedor_id) setVendedorId(cliente.vendedor_id)
  }

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

  const opcionesProductos = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: p.nombre, subtitulo: `stock: ${p.cantidad}` })),
    [productos]
  )

  const lineasValidas = useMemo(() => lineas.filter((l) => l.producto_id && l.cantidad), [lineas])

  // Mismo calculo que usa el server action al grabar (calcularImportes).
  const { subtotal, igv, total } = useMemo(
    () =>
      calcularImportes(
        lineasValidas.map((l) => ({
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario) || 0,
        }))
      ),
    [lineasValidas]
  )

  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
    }))
  )

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const vendedorSeleccionado = vendedores.find((v) => v.id === vendedorId)

  return (
    <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_480px]">
      <form action={formAction} className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <input type="hidden" name="lineas" value={lineasJson} />
        <input type="hidden" name="cliente_id" value={clienteId} />
        <input type="hidden" name="vendedor_id" value={vendedorId} />

        <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">📋 Cotización</h2>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Cliente *</label>
              <div className="mt-1.5">
                <Buscador
                  opciones={clientes}
                  valor={clienteId}
                  onChange={seleccionarCliente}
                  placeholder="Escribe el nombre del cliente..."
                  required
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Fecha *</label>
              <input
                type="date"
                name="fecha"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={CAMPO}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Vendedor *</label>
            <div className="mt-1.5">
              <Buscador
                opciones={vendedores}
                valor={vendedorId}
                onChange={(id) => setVendedorId(String(id))}
                placeholder="Escribe el nombre del vendedor..."
                required
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              Se asigna automáticamente según el vendedor del cliente — puedes cambiarlo si fue otra persona.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Días de crédito</label>
              <select
                name="dias_credito"
                value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)}
                className={CAMPO}
              >
                {DIAS_CREDITO.map((d) => (
                  <option key={d} value={d} className="text-[#1e293b] dark:text-slate-100">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Medio de pago</label>
              <select
                name="medio_pago"
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                className={CAMPO}
              >
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m} className="text-[#1e293b] dark:text-slate-100">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 dark:bg-slate-800/40 p-5">
            <div className="flex items-center justify-between">
              <label className={LABEL}>Productos *</label>
              <button
                type="button"
                onClick={agregarLinea}
                className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-sky-500/30 transition-all hover:bg-sky-600"
              >
                + Agregar línea
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {lineas.map((l, i) => {
                const producto = productos.find((p) => p.id === l.producto_id)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Buscador
                        opciones={opcionesProductos}
                        valor={l.producto_id}
                        onChange={(id) => actualizarProductoLinea(i, id)}
                        placeholder="Buscar producto..."
                      />
                    </div>
                    {producto && (
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-2 text-center text-[11px] font-bold ${
                          producto.cantidad <= 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                        title="Stock disponible"
                      >
                        📦 {producto.cantidad}
                      </span>
                    )}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Cant."
                      value={l.cantidad}
                      onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                      className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-sky-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio"
                      value={l.precio_unitario}
                      onChange={(e) => actualizarLinea(i, 'precio_unitario', e.target.value)}
                      className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-sky-500"
                    />
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
                )
              })}
            </div>

            <div className="mt-4 space-y-1 border-t-2 border-sky-100 pt-3 text-right">
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                Subtotal (sin IGV): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {subtotal.toFixed(2)}</span>
              </p>
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {igv.toFixed(2)}</span>
              </p>
              <p className="text-lg font-extrabold text-sky-600">Total: S/ {total.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <label className={LABEL}>Observación</label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className={CAMPO}
            />
            <input type="hidden" name="observacion" value={observacion} />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/40"
        >
          💾 Guardar cotización
        </button>

        {estado.error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {estado.error}
          </p>
        )}
        <p className="mt-2 text-center text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Al guardar se abre la cotización lista para descargar en PDF.
        </p>
      </form>

      <aside className="lg:sticky lg:top-6 rounded-3xl border-2 border-sky-200 bg-white dark:bg-[#141a2e] p-7 shadow-lg">
        <p className="mb-4 text-center text-xs font-bold tracking-widest text-sky-500 uppercase">
          👁️ Vista previa
        </p>
        <div className="flex items-start justify-between border-b-2 border-[#f1f5f9] dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">{empresa}</h2>
            <p className="text-sm text-[#64748b] dark:text-slate-400">Cotización</p>
          </div>
          <div className="text-right text-xs text-[#64748b] dark:text-slate-400">
            <p>Fecha: {fecha || '—'}</p>
            <p>{diasCredito}</p>
            <p>{medioPago}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm text-[#1e293b] dark:text-slate-100">
          <p>
            <span className="font-bold text-[#1e293b] dark:text-slate-100">Cliente:</span> {clienteSeleccionado?.nombre ?? '—'}
          </p>
          <p>
            <span className="font-bold text-[#1e293b] dark:text-slate-100">Vendedor:</span> {vendedorSeleccionado?.nombre ?? '—'}
          </p>
        </div>

        <table className="mt-5 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 text-[#64748b] dark:text-slate-400">
              <th className="py-2 font-bold">Producto</th>
              <th className="py-2 font-bold">Cant.</th>
              <th className="py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineasValidas.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[#94a3b8] dark:text-slate-500">
                  Agrega productos para verlos aquí.
                </td>
              </tr>
            ) : (
              lineasValidas.map((l, i) => {
                const producto = productos.find((p) => p.id === l.producto_id)
                return (
                  <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100">
                    <td className="py-2">{producto?.nombre ?? '—'}</td>
                    <td className="py-2">{l.cantidad}</td>
                    <td className="py-2 text-right">
                      S/ {(Number(l.cantidad) * Number(l.precio_unitario || 0)).toFixed(2)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t-2 border-[#f1f5f9] dark:border-slate-800 pt-3 text-right">
          <p className="text-sm text-[#64748b] dark:text-slate-400">Subtotal: S/ {subtotal.toFixed(2)}</p>
          <p className="text-sm text-[#64748b] dark:text-slate-400">
            IGV ({(IGV_TASA * 100).toFixed(0)}%): S/ {igv.toFixed(2)}
          </p>
          <p className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">Total: S/ {total.toFixed(2)}</p>
        </div>
      </aside>
    </div>
  )
}
