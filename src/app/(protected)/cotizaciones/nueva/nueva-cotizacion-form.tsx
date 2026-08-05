'use client'

import { useMemo, useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCotizacion, type EstadoFormulario } from '../actions'
import {
  IGV_TASA,
  calcularImportes,
  calcularDescuento,
  aplicarDescuento,
  type DescuentoTipo,
} from '@/lib/cotizaciones'
import { Buscador } from '@/components/buscador'
import { hoyPeruISO, haceNDiasPeruISO, sumarDiasISO } from '@/lib/fecha'
import { Modal } from '@/components/modal'
import { CotizacionDocumento } from '@/components/cotizacion-documento'
import { EditorTextoBasico } from '@/components/editor-texto-basico'

type Cliente = {
  id: number
  nombre: string
  documento: string | null
  direccion: string | null
  vendedor_id: string | null
  telefono: string | null
  email: string | null
}
type Producto = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  precio_venta: number | null
  unidades_medida: { nombre: string } | null
}
type Vendedor = { id: string; nombre: string }
type UnidadMedida = { id: number; nombre: string }
type Configuracion = {
  empresa: string
  ruc: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  titular: string | null
  yape: string | null
  cuenta_bcp_soles: string | null
  cci_bcp: string | null
  cuenta_bbva_soles: string | null
  cci_bbva: string | null
}
type Linea = {
  producto_id: number | ''
  cantidad: number | ''
  precio_unitario: number | ''
  caracteristicas: string
  fecha_entrega: string
  unidad_nombre: string
}

const DIAS_CREDITO = ['Contado', '7 días', '15 días', '30 días', '45 días', '60 días']
const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Yape', 'Plin']
const MONEDAS: { value: 'PEN' | 'USD'; label: string; simbolo: string }[] = [
  { value: 'PEN', label: 'Soles', simbolo: 'S/' },
  { value: 'USD', label: 'Dólares', simbolo: '$' },
]

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'
const CAMPO_LINEA =
  'w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-2 text-xs text-[#1e293b] dark:text-slate-100 outline-none focus:border-sky-500'

export function NuevaCotizacionForm({
  clientes,
  productos,
  vendedores,
  unidadesMedida,
  usuarioActualId,
  configuracion,
}: {
  clientes: Cliente[]
  productos: Producto[]
  vendedores: Vendedor[]
  unidadesMedida: UnidadMedida[]
  usuarioActualId: string
  configuracion: Configuracion
}) {
  const router = useRouter()
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearCotizacion, {
    error: null,
  })

  const [clienteId, setClienteId] = useState<number | ''>('')
  const [fecha, setFecha] = useState(hoyPeruISO())
  const [fechaEntrega, setFechaEntrega] = useState(hoyPeruISO())
  const [diasCredito, setDiasCredito] = useState('Contado')
  const [medioPago, setMedioPago] = useState('Transferencia')
  const [vendedorId, setVendedorId] = useState(usuarioActualId)
  const [observacion, setObservacion] = useState('')
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN')
  const [documentoReferencia, setDocumentoReferencia] = useState('')
  const [vigenciaDias, setVigenciaDias] = useState(15)
  const [vigenciaActiva, setVigenciaActiva] = useState(true)
  const [descuentoTipo, setDescuentoTipo] = useState<DescuentoTipo>('porcentaje')
  const [descuentoValor, setDescuentoValor] = useState<number | ''>('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [productoParaAgregar, setProductoParaAgregar] = useState<number | ''>('')
  const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false)
  const [lineaCaracteristicas, setLineaCaracteristicas] = useState<number | null>(null)

  function seleccionarCliente(id: number | string | '') {
    const nuevoId = Number(id) || ''
    setClienteId(nuevoId)
    const cliente = clientes.find((c) => c.id === nuevoId)
    if (cliente?.vendedor_id) setVendedorId(cliente.vendedor_id)
  }

  function actualizarLinea(i: number, campo: 'cantidad' | 'precio_unitario', valor: string) {
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
          unidad_nombre: producto?.unidades_medida?.nombre ?? l.unidad_nombre,
        }
      })
    )
  }

  function actualizarCaracteristicas(i: number, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, caracteristicas: valor } : l)))
  }

  function actualizarFechaEntregaLinea(i: number, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, fecha_entrega: valor } : l)))
  }

  function actualizarUnidadLinea(i: number, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, unidad_nombre: valor } : l)))
  }

  function agregarProductoDesdeBuscador(productoId: number | string | '') {
    const id = Number(productoId)
    if (!id) return
    const producto = productos.find((p) => p.id === id)
    setLineas((prev) => [
      ...prev,
      {
        producto_id: id,
        cantidad: 1,
        precio_unitario: producto?.precio_venta ?? '',
        caracteristicas: '',
        fecha_entrega: hoyPeruISO(),
        unidad_nombre: producto?.unidades_medida?.nombre ?? '',
      },
    ])
    setProductoParaAgregar('')
  }

  function quitarLinea(i: number) {
    setLineas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const opcionesProductos = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: p.nombre, subtitulo: `stock: ${p.cantidad}` })),
    [productos]
  )

  const lineasValidas = useMemo(() => lineas.filter((l) => l.producto_id && l.cantidad), [lineas])

  // Mismo calculo que usa el server action al grabar (calcularImportes +
  // descuento), para que lo que ve el vendedor en pantalla sea exactamente
  // lo que se guarda.
  const importesBrutos = useMemo(
    () =>
      calcularImportes(
        lineasValidas.map((l) => ({
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario) || 0,
        }))
      ),
    [lineasValidas]
  )
  const descuentoMonto = useMemo(
    () => calcularDescuento(importesBrutos.total, descuentoTipo, Number(descuentoValor) || 0),
    [importesBrutos.total, descuentoTipo, descuentoValor]
  )
  const { subtotal, igv, total } = useMemo(
    () => aplicarDescuento(importesBrutos, descuentoMonto),
    [importesBrutos, descuentoMonto]
  )

  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
    }))
  )

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const vendedorSeleccionado = vendedores.find((v) => v.id === vendedorId)
  const simbolo = MONEDAS.find((m) => m.value === moneda)?.simbolo ?? 'S/'
  const fechaVencimientoOferta = fecha ? sumarDiasISO(fecha, Number(vigenciaDias) || 15) : ''

  // Solo dígitos, para el link de WhatsApp Web (web.whatsapp.com/send?phone=...
  // no acepta espacios/guiones/+).
  const telefonoClienteDigitos = clienteSeleccionado?.telefono?.replace(/\D/g, '') ?? ''
  const mensajeCompartirCotizacion = estado.exito
    ? `Hola${clienteSeleccionado ? ' ' + clienteSeleccionado.nombre : ''}, te comparto la cotización ${estado.exito.numero} por un total de ${
        estado.exito.moneda === 'USD' ? '$' : 'S/'
      } ${estado.exito.total.toFixed(2)}.`
    : ''

  const lineasDocumento = useMemo(
    () =>
      lineasValidas.map((l) => {
        const producto = productos.find((p) => p.id === l.producto_id)
        return {
          codigo: producto?.codigo ?? null,
          nombre: producto?.nombre ?? '—',
          unidad: l.unidad_nombre || producto?.unidades_medida?.nombre || null,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precio_unitario) || 0,
          caracteristicas: l.caracteristicas || null,
        }
      }),
    [lineasValidas, productos]
  )

  const lineaEnEdicion = lineaCaracteristicas !== null ? lineas[lineaCaracteristicas] : null

  return (
    <>
      <div className="mt-6 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <form action={formAction}>
          <input type="hidden" name="lineas" value={lineasJson} />
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="vendedor_id" value={vendedorId} />

          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold text-[#1e293b] dark:text-slate-100">📋 Cotización</h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVistaPreviaAbierta(true)}
                className="flex items-center gap-2 rounded-md border-2 border-sky-200 bg-white dark:bg-[#141a2e] px-5 py-2.5 text-sm font-bold text-sky-700 dark:text-sky-400 transition-all hover:bg-sky-50 active:scale-95"
              >
                👁️ Vista previa
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-md bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all active:scale-95"
              >
                💾 Guardar cotización
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
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
            </div>

            <div>
              <label className={LABEL}>Fecha de emisión *</label>
              <input
                type="date"
                name="fecha"
                required
                min={haceNDiasPeruISO(3)}
                max={hoyPeruISO()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={CAMPO}
              />
            </div>
            <div>
              <label className={LABEL}>Fecha de entrega (general)</label>
              <input
                type="date"
                name="fecha_entrega"
                min={hoyPeruISO()}
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className={CAMPO}
              />
              <p className="mt-1.5 text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
                Puedes además poner una fecha distinta por producto abajo, si algún ítem llega en otra fecha.
              </p>
            </div>
            <div>
              <label className={LABEL}>Moneda</label>
              <select
                name="moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'PEN' | 'USD')}
                className={CAMPO}
              >
                {MONEDAS.map((m) => (
                  <option key={m.value} value={m.value} className="text-[#1e293b] dark:text-slate-100">
                    {m.label} ({m.simbolo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Documento de referencia</label>
              <input
                type="text"
                name="documento_referencia"
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Ej. Orden de compra N° 123"
                className={CAMPO}
              />
            </div>
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

            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL}>Vigencia de la oferta (días)</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vigenciaActiva}
                  title={vigenciaActiva ? 'Desactivar vigencia de la oferta' : 'Activar vigencia de la oferta'}
                  onClick={() => setVigenciaActiva((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    vigenciaActiva ? 'bg-sky-500' : 'bg-[#e2e8f0] dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      vigenciaActiva ? 'translate-x-[18px]' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <input
                type="number"
                name="vigencia_dias"
                min={1}
                disabled={!vigenciaActiva}
                value={vigenciaDias}
                onChange={(e) => setVigenciaDias(Number(e.target.value) || 15)}
                className={`${CAMPO} disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {vigenciaActiva && fecha ? (
                <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
                  Válida hasta el {new Date(`${fechaVencimientoOferta}T00:00:00`).toLocaleDateString('es-PE')}.
                </p>
              ) : (
                !vigenciaActiva && (
                  <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
                    Esta cotización no tendrá fecha de vencimiento.
                  </p>
                )
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-sky-50 dark:bg-slate-800/40 p-5">
            <label className={LABEL}>Productos *</label>
            <div className="mt-1.5">
              <Buscador
                opciones={opcionesProductos}
                valor={productoParaAgregar}
                onChange={agregarProductoDesdeBuscador}
                placeholder="Buscar producto para agregarlo a la cotización..."
              />
            </div>

            {lineas.length === 0 && (
              <p className="mt-3 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
                Todavía no agregaste ningún producto — búscalo arriba para agregarlo.
              </p>
            )}

            {lineas.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[31%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead>
                  <tr className="text-[10px] font-bold tracking-wide text-[#64748b] uppercase dark:text-slate-400">
                    <th className="px-1.5 pb-1.5 font-bold">Código</th>
                    <th className="px-1.5 pb-1.5 font-bold">Descripción</th>
                    <th className="px-1.5 pb-1.5 font-bold">Características</th>
                    <th className="px-1.5 pb-1.5 font-bold">Fecha entrega</th>
                    <th className="px-1.5 pb-1.5 font-bold">Cantidad</th>
                    <th className="px-1.5 pb-1.5 font-bold">U.M</th>
                    <th className="px-1.5 pb-1.5 font-bold">P. unitario</th>
                    <th className="px-1.5 pb-1.5 font-bold">VUV</th>
                    <th className="px-1.5 pb-1.5 font-bold">Total</th>
                    <th className="px-1.5 pb-1.5 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const producto = productos.find((p) => p.id === l.producto_id)
                    const vuv = (Number(l.precio_unitario) || 0) / (1 + IGV_TASA)
                    const totalLinea = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0)
                    return (
                      <tr key={i} className="align-top">
                        <td className="px-1.5 py-1.5">
                          <div className="flex h-9 w-full items-center overflow-hidden rounded-lg border-2 border-[#e2e8f0] bg-[#f8fafc] px-2 text-[11px] text-[#64748b] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                            {producto?.codigo || '—'}
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <Buscador
                            opciones={opcionesProductos}
                            valor={l.producto_id}
                            onChange={(id) => actualizarProductoLinea(i, id)}
                            placeholder="Buscar producto..."
                            compacto
                          />
                          {producto && (
                            <span
                              className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-center text-[10px] font-bold ${
                                producto.cantidad <= 0 ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              📦 stock: {producto.cantidad}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => setLineaCaracteristicas(i)}
                            className="text-[11px] font-bold text-sky-600 underline hover:text-sky-700"
                          >
                            {l.caracteristicas ? 'Editar' : 'Características'}
                          </button>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            type="date"
                            min={hoyPeruISO()}
                            value={l.fecha_entrega}
                            onChange={(e) => actualizarFechaEntregaLinea(i, e.target.value)}
                            className={CAMPO_LINEA}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Cant."
                            value={l.cantidad}
                            onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                            className={CAMPO_LINEA}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <select
                            value={l.unidad_nombre}
                            onChange={(e) => actualizarUnidadLinea(i, e.target.value)}
                            className={CAMPO_LINEA}
                          >
                            <option value="">—</option>
                            {unidadesMedida.map((u) => (
                              <option key={u.id} value={u.nombre}>
                                {u.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={l.precio_unitario}
                            onChange={(e) => actualizarLinea(i, 'precio_unitario', e.target.value)}
                            className={CAMPO_LINEA}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <div className="flex h-9 w-full items-center overflow-hidden rounded-lg bg-[#f8fafc] px-2 text-[11px] font-medium text-[#64748b] dark:bg-slate-800/60 dark:text-slate-400">
                            {simbolo} {vuv.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <div className="flex h-9 w-full items-center overflow-hidden rounded-lg bg-sky-100 px-2 text-[11px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                            {simbolo} {totalLinea.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => quitarLinea(i)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748b] transition-all hover:bg-red-100 hover:text-red-600 dark:bg-[#141a2e] dark:text-slate-400"
                            title="Quitar línea"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}

            <div className="mt-4 flex flex-col items-end gap-3 border-t-2 border-sky-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Descuento global</label>
                <div className="flex overflow-hidden rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDescuentoTipo('porcentaje')}
                    className={`px-3 py-2 text-xs font-bold transition-all ${
                      descuentoTipo === 'porcentaje'
                        ? 'bg-sky-500 text-white'
                        : 'bg-white dark:bg-[#141a2e] text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescuentoTipo('monto')}
                    className={`px-3 py-2 text-xs font-bold transition-all ${
                      descuentoTipo === 'monto'
                        ? 'bg-sky-500 text-white'
                        : 'bg-white dark:bg-[#141a2e] text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    {simbolo}
                  </button>
                </div>
                <input
                  type="number"
                  name="descuento_valor"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={descuentoValor}
                  onChange={(e) => setDescuentoValor(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-sky-500"
                />
                <input type="hidden" name="descuento_tipo" value={descuentoTipo} />
              </div>

              <div className="space-y-1 text-right">
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  Subtotal (sin IGV): <span className="font-bold text-[#1e293b] dark:text-slate-100">{simbolo} {subtotal.toFixed(2)}</span>
                </p>
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b] dark:text-slate-100">{simbolo} {igv.toFixed(2)}</span>
                </p>
                {descuentoMonto > 0 && (
                  <p className="text-sm text-red-600">
                    Descuento: <span className="font-bold">− {simbolo} {descuentoMonto.toFixed(2)}</span>
                  </p>
                )}
                <p className="text-lg font-extrabold text-sky-600">Total: {simbolo} {total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className={LABEL}>Observaciones</label>
            <div className="mt-1.5">
              <EditorTextoBasico valor={observacion} onChange={setObservacion} name="observacion" rows={3} />
            </div>
          </div>

          {estado.error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {estado.error}
            </p>
          )}
        </form>
      </div>

      <Modal abierto={!!estado.exito} onClose={() => router.push('/cotizaciones')} className="max-w-sm">
        {estado.exito && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-emerald-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-extrabold text-emerald-600">Cotización registrada con éxito</p>
            <p className="mt-1 text-sm font-bold text-[#1e293b] dark:text-slate-100">
              Documento generado: {estado.exito.numero}
            </p>
            <p className="text-sm text-[#64748b] dark:text-slate-400">
              Monto total: {estado.exito.moneda === 'USD' ? '$' : 'S/'} {estado.exito.total.toFixed(2)}
            </p>

            <div className="mt-5 flex w-full flex-col gap-2.5">
              <a
                href={`/cotizaciones/${estado.exito.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm shadow-sky-500/30 transition-all active:scale-95"
              >
                📄 Ver / descargar PDF
              </a>
              <a
                href={`mailto:${clienteSeleccionado?.email ?? ''}?subject=${encodeURIComponent(
                  `Cotización ${estado.exito.numero}`
                )}&body=${encodeURIComponent(mensajeCompartirCotizacion)}`}
                className="rounded-md border-2 border-[#e2e8f0] px-4 py-2.5 text-center text-sm font-bold text-[#1e293b] transition-all hover:bg-[#f8fafc] active:scale-95 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                ✉️ Enviar por correo
              </a>
              <a
                href={`https://web.whatsapp.com/send?${
                  telefonoClienteDigitos ? `phone=${telefonoClienteDigitos}&` : ''
                }text=${encodeURIComponent(mensajeCompartirCotizacion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-emerald-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
              >
                🟢 Enviar por WhatsApp Web
              </a>
              <button
                type="button"
                onClick={() => router.push('/cotizaciones')}
                className="rounded-md bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 dark:bg-red-950/30 dark:hover:bg-red-950/50"
              >
                Cerrar
              </button>
            </div>
            {!telefonoClienteDigitos && (
              <p className="mt-2.5 text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
                Este cliente no tiene teléfono guardado — en WhatsApp Web vas a tener que elegir el contacto a mano
                (recuerda tener WhatsApp Web abierto y con la sesión iniciada).
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal abierto={lineaCaracteristicas !== null} onClose={() => setLineaCaracteristicas(null)} className="max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-extrabold text-[#1e293b] dark:text-slate-100">Características</p>
          <button
            type="button"
            onClick={() => setLineaCaracteristicas(null)}
            title="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#64748b] transition-all hover:bg-[#f1f5f9] active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {lineaEnEdicion && (
          <div className="mt-4">
            <EditorTextoBasico
              valor={lineaEnEdicion.caracteristicas}
              onChange={(valor) => actualizarCaracteristicas(lineaCaracteristicas!, valor)}
              rows={4}
              maxLength={400}
              placeholder="Ej. Color blanco, presentación x 200 unidades..."
            />
            <button
              type="button"
              onClick={() => setLineaCaracteristicas(null)}
              className="mt-4 w-full rounded-md bg-gradient-to-r from-sky-500 to-blue-500 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/30 transition-all active:scale-95"
            >
              Guardar
            </button>
          </div>
        )}
      </Modal>

      <Modal abierto={vistaPreviaAbierta} onClose={() => setVistaPreviaAbierta(false)} className="max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-xs font-bold tracking-widest text-sky-500 uppercase">👁️ Vista previa</p>
          <button
            type="button"
            onClick={() => setVistaPreviaAbierta(false)}
            title="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#64748b] transition-all hover:bg-[#f1f5f9] active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <CotizacionDocumento
          numero="(se genera al guardar)"
          empresa={configuracion.empresa}
          titular={configuracion.titular}
          ruc={configuracion.ruc}
          direccion={configuracion.direccion}
          telefono={configuracion.telefono}
          email={configuracion.email}
          yape={configuracion.yape}
          cuentaBcpSoles={configuracion.cuenta_bcp_soles}
          cciBcp={configuracion.cci_bcp}
          cuentaBbvaSoles={configuracion.cuenta_bbva_soles}
          cciBbva={configuracion.cci_bbva}
          fecha={fecha}
          fechaEntrega={fechaEntrega || null}
          documentoReferencia={documentoReferencia || null}
          condicionVenta={diasCredito}
          cliente={clienteSeleccionado?.nombre ?? '—'}
          documentoCliente={clienteSeleccionado?.documento ?? null}
          direccionCliente={clienteSeleccionado?.direccion ?? null}
          vendedor={vendedorSeleccionado?.nombre ?? '—'}
          lineas={lineasDocumento}
          subtotal={subtotal}
          igv={igv}
          descuentoMonto={descuentoMonto}
          descuentoTipo={descuentoTipo}
          descuentoValor={Number(descuentoValor) || 0}
          total={total}
          simbolo={simbolo}
          moneda={moneda}
          observaciones={observacion}
          vigenciaDias={Number(vigenciaDias) || 15}
        />
      </Modal>
    </>
  )
}
