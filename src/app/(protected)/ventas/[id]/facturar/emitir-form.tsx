'use client'

import { useActionState, useMemo, useState } from 'react'
import { emitirComprobante, type EstadoFormulario } from '../../actions'
import { IGV_TASA } from '@/lib/cotizaciones'
import { DIAS_CREDITO_OPCIONES, MEDIOS_PAGO, TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { Buscador } from '@/components/buscador'

type Cliente = { id: number; nombre: string; documento: string | null }
type Producto = { id: number; nombre: string; precio_venta: number | null }
type Vendedor = { id: string; nombre: string }
type Linea = { producto_id: number | ''; cantidad: number | ''; precio_unitario: number | '' }
type TipoComprobante = 'factura' | 'boleta' | 'nota_venta' | 'ticket'

const TIPOS: TipoComprobante[] = ['factura', 'boleta', 'nota_venta', 'ticket']

function lineaVacia(): Linea {
  return { producto_id: '', cantidad: '', precio_unitario: '' }
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
const LABEL = 'block text-sm font-bold text-[#1e293b]'

export function EmitirComprobanteForm({
  ordenId,
  clienteIdInicial,
  lineasIniciales,
  clientes,
  productos,
  vendedores,
  usuarioActualId,
  empresa,
}: {
  ordenId: number
  clienteIdInicial: number
  lineasIniciales: { producto_id: number; cantidad: number; precio_unitario: number }[]
  clientes: Cliente[]
  productos: Producto[]
  vendedores: Vendedor[]
  usuarioActualId: string
  empresa: string
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(emitirComprobante, { error: null })

  const [tab, setTab] = useState<'venta' | 'vendedor'>('venta')
  const [tipo, setTipo] = useState<TipoComprobante>('boleta')
  const [clienteId, setClienteId] = useState<number | ''>(clienteIdInicial)
  const [fecha, setFecha] = useState(hoyISO())
  const [diasCredito, setDiasCredito] = useState('Contado')
  const [medioPago, setMedioPago] = useState('Transferencia')
  const [vendedorId, setVendedorId] = useState(usuarioActualId)
  const [lineas, setLineas] = useState<Linea[]>(
    lineasIniciales.length > 0
      ? lineasIniciales.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, precio_unitario: l.precio_unitario }))
      : [lineaVacia()]
  )
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const tieneRuc = (clienteSeleccionado?.documento ?? '').trim().length === 11

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor === '' ? '' : Number(valor) } : l)))
  }

  function actualizarProductoLinea(i: number, productoId: number | string | '') {
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        const producto = productos.find((p) => p.id === Number(productoId))
        return { ...l, producto_id: Number(productoId) || '', precio_unitario: producto?.precio_venta ?? l.precio_unitario }
      })
    )
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()])
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  const lineasValidas = useMemo(() => lineas.filter((l) => l.producto_id && l.cantidad), [lineas])
  const subtotal = useMemo(
    () => lineasValidas.reduce((acc, l) => acc + Number(l.cantidad) * (Number(l.precio_unitario) || 0), 0),
    [lineasValidas]
  )
  const igv = subtotal * IGV_TASA
  const total = subtotal + igv

  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
    }))
  )

  const vendedorSeleccionado = vendedores.find((v) => v.id === vendedorId)

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_460px]">
        <form action={formAction} className="rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
          <input type="hidden" name="orden_id" value={ordenId} />
          <input type="hidden" name="lineas" value={lineasJson} />
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="vendedor_id" value={vendedorId} />

          <div className="flex gap-2 border-b-2 border-[#f1f5f9]">
            <button
              type="button"
              onClick={() => setTab('venta')}
              className={`-mb-0.5 rounded-t-xl border-b-2 px-5 py-3 text-sm font-bold transition-all ${
                tab === 'venta' ? 'border-teal-500 text-teal-600' : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              🧾 Comprobante
            </button>
            <button
              type="button"
              onClick={() => setTab('vendedor')}
              className={`-mb-0.5 rounded-t-xl border-b-2 px-5 py-3 text-sm font-bold transition-all ${
                tab === 'vendedor' ? 'border-teal-500 text-teal-600' : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              🧑‍💼 Vendedor
            </button>
          </div>

          <div className={tab === 'venta' ? 'mt-6 space-y-5' : 'hidden'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Tipo de comprobante *</label>
                <select
                  name="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoComprobante)}
                  className={CAMPO}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t} disabled={t === 'factura' && !tieneRuc} className="text-[#1e293b]">
                      {TIPO_COMPROBANTE_LABELS[t]} {t === 'factura' && !tieneRuc ? '(requiere RUC)' : ''}
                    </option>
                  ))}
                </select>
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
              <div>
                <label className={LABEL}>Cliente *</label>
                <div className="mt-1.5">
                  <Buscador
                    opciones={clientes}
                    valor={clienteId}
                    onChange={(id) => setClienteId(Number(id) || '')}
                    placeholder="Escribe el nombre del cliente..."
                    required
                  />
                </div>
              </div>
            </div>

            {tipo === 'factura' && !tieneRuc && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
                Este cliente no tiene RUC de 11 dígitos — selecciona Boleta, Nota de venta o Ticket, o cambia
                de cliente.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Días de crédito</label>
                <select name="dias_credito" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value)} className={CAMPO}>
                  {DIAS_CREDITO_OPCIONES.map((d) => (
                    <option key={d} value={d} className="text-[#1e293b]">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Medio de pago</label>
                <select name="medio_pago" value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className={CAMPO}>
                  {MEDIOS_PAGO.map((m) => (
                    <option key={m} value={m} className="text-[#1e293b]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
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
                {lineas.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Buscador
                        opciones={productos}
                        valor={l.producto_id}
                        onChange={(id) => actualizarProductoLinea(i, id)}
                        placeholder="Buscar producto..."
                      />
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
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
                ))}
              </div>

              <div className="mt-4 space-y-1 border-t-2 border-teal-100 pt-3 text-right">
                <p className="text-sm text-[#64748b]">
                  Subtotal (sin IGV): <span className="font-bold text-[#1e293b]">S/ {subtotal.toFixed(2)}</span>
                </p>
                <p className="text-sm text-[#64748b]">
                  IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b]">S/ {igv.toFixed(2)}</span>
                </p>
                <p className="text-lg font-extrabold text-teal-600">Total: S/ {total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className={tab === 'vendedor' ? 'mt-6 space-y-5' : 'hidden'}>
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
              <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">
                Por defecto queda seleccionado quien está registrando la venta — cámbialo si fue otra persona.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setVistaPrevia((v) => !v)}
              className="flex-1 rounded-xl border-2 border-teal-200 bg-white py-3.5 text-base font-bold text-teal-700 transition-all hover:bg-teal-50 xl:hidden"
            >
              👁️ {vistaPrevia ? 'Ocultar' : 'Vista previa'}
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40"
            >
              💾 Grabar venta
            </button>
          </div>

          {estado.error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {estado.error}
            </p>
          )}
          <p className="mt-2 text-center text-xs font-medium text-[#94a3b8]">
            Al grabar se descuenta el stock y se genera el comprobante con numeración correlativa.
          </p>
        </form>

        <aside className={`rounded-3xl border-2 border-teal-200 bg-white p-7 shadow-lg xl:sticky xl:top-6 xl:block ${vistaPrevia ? 'block' : 'hidden'}`}>
          <p className="mb-4 text-center text-xs font-bold tracking-widest text-teal-500 uppercase">👁️ Vista previa</p>
          <div className="flex items-start justify-between border-b-2 border-[#f1f5f9] pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#1e293b]">{empresa}</h2>
              <p className="text-sm text-[#64748b]">{TIPO_COMPROBANTE_LABELS[tipo]}</p>
            </div>
            <div className="text-right text-xs text-[#64748b]">
              <p>Fecha: {fecha || '—'}</p>
              <p>{diasCredito}</p>
              <p>{medioPago}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <p>
              <span className="font-bold text-[#1e293b]">Cliente:</span> {clienteSeleccionado?.nombre ?? '—'}
            </p>
            <p>
              <span className="font-bold text-[#1e293b]">Vendedor:</span> {vendedorSeleccionado?.nombre ?? '—'}
            </p>
          </div>

          <table className="mt-5 w-full text-left text-[13px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] text-[#64748b]">
                <th className="py-2 font-bold">Producto</th>
                <th className="py-2 font-bold">Cant.</th>
                <th className="py-2 text-right font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineasValidas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[#94a3b8]">
                    Agrega productos para verlos aquí.
                  </td>
                </tr>
              ) : (
                lineasValidas.map((l, i) => {
                  const producto = productos.find((p) => p.id === l.producto_id)
                  return (
                    <tr key={i} className="border-b border-[#f1f5f9]">
                      <td className="py-2">{producto?.nombre ?? '—'}</td>
                      <td className="py-2">{l.cantidad}</td>
                      <td className="py-2 text-right">S/ {(Number(l.cantidad) * Number(l.precio_unitario || 0)).toFixed(2)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          <div className="mt-4 space-y-1 border-t-2 border-[#f1f5f9] pt-3 text-right">
            <p className="text-sm text-[#64748b]">Subtotal: S/ {subtotal.toFixed(2)}</p>
            <p className="text-sm text-[#64748b]">
              IGV ({(IGV_TASA * 100).toFixed(0)}%): S/ {igv.toFixed(2)}
            </p>
            <p className="text-lg font-extrabold text-[#1e293b]">Total: S/ {total.toFixed(2)}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
