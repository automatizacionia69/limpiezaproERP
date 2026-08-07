'use client'

import { useMemo, useState, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearCotizacion, actualizarCotizacion, enviarCorreoCotizacion, type EstadoFormulario } from '../actions'
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
import { AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

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
  tipo_afectacion_igv: string
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
  tipo_afectacion_igv: string
}
export type CotizacionExistente = {
  id: number
  clienteId: number
  fecha: string
  fechaEntrega: string
  diasCredito: string
  medioPago: string
  vendedorId: string
  observacion: string
  moneda: 'PEN' | 'USD'
  documentoReferencia: string
  vigenciaDias: number | null
  descuentoTipo: DescuentoTipo
  descuentoValor: number | ''
  lineas: Linea[]
}

const DIAS_CREDITO = ['Contado', '7 días', '15 días', '30 días', '45 días', '60 días']
const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Yape', 'Plin']
const MONEDAS: { value: 'PEN' | 'USD'; label: string; simbolo: string }[] = [
  { value: 'PEN', label: 'Soles', simbolo: 'S/' },
  { value: 'USD', label: 'Dólares', simbolo: '$' },
]

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
// Igual que CAMPO pero sin `w-full` — para campos dentro de una fila flex
// (ej. código de país + número) donde el ancho lo define el propio flex,
// no el campo. Concatenar `w-16`/`flex-1` directo sobre CAMPO no sirve:
// `w-full` seguiría presente en la clase y Tailwind resuelve el choque por
// orden de la hoja de estilos generada, no por orden en el string.
const CAMPO_SIN_ANCHO = CAMPO.replace('w-full ', '')
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" className={className}>
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  )
}

function IconoCorreo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}
const CAMPO_LINEA =
  'w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-2 text-xs text-[#1e293b] dark:text-slate-100 outline-none focus:border-sky-500'

export function NuevaCotizacionForm({
  clientes,
  productos,
  vendedores,
  unidadesMedida,
  usuarioActualId,
  configuracion,
  cotizacionExistente,
}: {
  clientes: Cliente[]
  productos: Producto[]
  vendedores: Vendedor[]
  unidadesMedida: UnidadMedida[]
  usuarioActualId: string
  configuracion: Configuracion
  /** Presente solo en /cotizaciones/[id]/editar — precarga el formulario y hace que Guardar actualice en vez de crear. */
  cotizacionExistente?: CotizacionExistente
}) {
  const router = useRouter()
  const accionFormulario = cotizacionExistente
    ? (prevState: EstadoFormulario, formData: FormData) => actualizarCotizacion(cotizacionExistente.id, prevState, formData)
    : crearCotizacion
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(accionFormulario, {
    error: null,
  })

  const [clienteId, setClienteId] = useState<number | ''>(cotizacionExistente?.clienteId ?? '')
  const [fecha, setFecha] = useState(cotizacionExistente?.fecha ?? hoyPeruISO())
  const [fechaEntrega, setFechaEntrega] = useState(cotizacionExistente?.fechaEntrega ?? hoyPeruISO())
  const [diasCredito, setDiasCredito] = useState(cotizacionExistente?.diasCredito ?? 'Contado')
  const [medioPago, setMedioPago] = useState(cotizacionExistente?.medioPago ?? 'Transferencia')
  const [vendedorId, setVendedorId] = useState(cotizacionExistente?.vendedorId ?? usuarioActualId)
  const [observacion, setObservacion] = useState(cotizacionExistente?.observacion ?? '')
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>(cotizacionExistente?.moneda ?? 'PEN')
  const [documentoReferencia, setDocumentoReferencia] = useState(cotizacionExistente?.documentoReferencia ?? '')
  const [vigenciaDias, setVigenciaDias] = useState(cotizacionExistente?.vigenciaDias ?? 15)
  const [vigenciaActiva, setVigenciaActiva] = useState(cotizacionExistente ? cotizacionExistente.vigenciaDias !== null : true)
  const [descuentoTipo, setDescuentoTipo] = useState<DescuentoTipo>(cotizacionExistente?.descuentoTipo ?? 'porcentaje')
  const [descuentoValor, setDescuentoValor] = useState<number | ''>(cotizacionExistente?.descuentoValor ?? '')
  const [lineas, setLineas] = useState<Linea[]>(cotizacionExistente?.lineas ?? [])
  const [productoParaAgregar, setProductoParaAgregar] = useState<number | ''>('')
  const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false)
  const [lineaCaracteristicas, setLineaCaracteristicas] = useState<number | null>(null)

  const [exitoIdCargado, setExitoIdCargado] = useState<number | null>(null)
  const [codigoPaisWhatsapp, setCodigoPaisWhatsapp] = useState('+51')
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('')
  const [correoDestino, setCorreoDestino] = useState('')
  const [correoEstado, setCorreoEstado] = useState<'idle' | 'enviado' | 'error'>('idle')
  const [correoError, setCorreoError] = useState<string | null>(null)
  const [enviandoCorreo, iniciarEnvioCorreo] = useTransition()

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
          tipo_afectacion_igv: producto?.tipo_afectacion_igv ?? l.tipo_afectacion_igv,
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
        tipo_afectacion_igv: producto?.tipo_afectacion_igv ?? AFECTACION_IGV_DEFAULT,
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
          tipo_afectacion_igv: l.tipo_afectacion_igv,
        }))
      ),
    [lineasValidas]
  )
  const descuentoMonto = useMemo(
    () => calcularDescuento(importesBrutos.total, descuentoTipo, Number(descuentoValor) || 0),
    [importesBrutos.total, descuentoTipo, descuentoValor]
  )
  const importesFinales = useMemo(
    () => aplicarDescuento(importesBrutos, descuentoMonto),
    [importesBrutos, descuentoMonto]
  )
  const { subtotal, igv, total, opGravada, opExonerada, opInafecta } = importesFinales

  const lineasJson = JSON.stringify(
    lineasValidas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad),
      precio_unitario: Number(l.precio_unitario) || 0,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
      tipo_afectacion_igv: l.tipo_afectacion_igv || AFECTACION_IGV_DEFAULT,
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
  const enlaceCotizacion =
    estado.exito && typeof window !== 'undefined'
      ? `${window.location.origin}/cotizaciones/${estado.exito.id}`
      : ''
  const mensajeConEnlace =
    mensajeCompartirCotizacion && enlaceCotizacion
      ? `${mensajeCompartirCotizacion}\n\nVer cotización: ${enlaceCotizacion}`
      : mensajeCompartirCotizacion

  // Cada vez que se registra una cotización nueva (cambia el id de éxito), se
  // precargan el destino de correo y el teléfono con los datos del cliente —
  // el código de país siempre vuelve a +51 por defecto, editable si hace
  // falta. Se ajusta durante el render (no en un efecto) siguiendo el patrón
  // recomendado por React para "resetear estado cuando cambia una prop".
  if (estado.exito && estado.exito.id !== exitoIdCargado) {
    setExitoIdCargado(estado.exito.id)
    setCodigoPaisWhatsapp('+51')
    setTelefonoWhatsapp(telefonoClienteDigitos)
    setCorreoDestino(clienteSeleccionado?.email ?? '')
    setCorreoEstado('idle')
    setCorreoError(null)
  }

  function abrirWhatsApp() {
    const digitos = `${codigoPaisWhatsapp.replace(/\D/g, '')}${telefonoWhatsapp.replace(/\D/g, '')}`
    const url = `https://web.whatsapp.com/send?${
      digitos ? `phone=${digitos}&` : ''
    }text=${encodeURIComponent(mensajeConEnlace)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function manejarEnviarCorreo() {
    if (!estado.exito) return
    setCorreoEstado('idle')
    setCorreoError(null)
    iniciarEnvioCorreo(async () => {
      try {
        await enviarCorreoCotizacion(correoDestino, `Cotización ${estado.exito!.numero}`, mensajeConEnlace)
        setCorreoEstado('enviado')
      } catch (error) {
        setCorreoError(error instanceof Error ? error.message : 'No se pudo enviar el correo.')
        setCorreoEstado('error')
      }
    })
  }

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
                💾 {cotizacionExistente ? 'Guardar cambios' : 'Guardar cotización'}
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

      <Modal abierto={!!estado.exito} onClose={() => router.push('/cotizaciones')} className="max-w-md">
        {estado.exito && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => router.push('/cotizaciones')}
              title="Cerrar"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#64748b] transition-all hover:bg-[#f1f5f9] active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="-mx-6 -mt-6 flex flex-col items-center rounded-t-3xl bg-gradient-to-b from-emerald-50 to-white px-6 pb-5 pt-7 text-center dark:from-emerald-950/40 dark:to-[#141a2e]">
              <div className="animar-entrada-check flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-extrabold text-emerald-600">
                {cotizacionExistente ? 'Cotización actualizada con éxito' : 'Cotización registrada con éxito'}
              </p>
              <p className="mt-1 text-sm font-bold text-[#1e293b] dark:text-slate-100">
                Documento generado: {estado.exito.numero}
              </p>
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                Monto total: {estado.exito.moneda === 'USD' ? '$' : 'S/'} {estado.exito.total.toFixed(2)}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="rounded-md border-2 border-[#e2e8f0] p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base dark:bg-sky-950/50">
                    📄
                  </span>
                  <span className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Ver / descargar PDF</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a
                    href={`/cotizaciones/${estado.exito.id}?formato=a4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border-2 border-[#e2e8f0] py-2 text-center text-xs font-bold text-[#1e293b] transition-all hover:bg-[#f8fafc] active:scale-95 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    A4
                  </a>
                  <a
                    href={`/cotizaciones/${estado.exito.id}?formato=ticket80`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border-2 border-[#e2e8f0] py-2 text-center text-xs font-bold text-[#1e293b] transition-all hover:bg-[#f8fafc] active:scale-95 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Ticket 80mm
                  </a>
                  <a
                    href={`/cotizaciones/${estado.exito.id}?formato=a5`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border-2 border-[#e2e8f0] py-2 text-center text-xs font-bold text-[#1e293b] transition-all hover:bg-[#f8fafc] active:scale-95 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    A5
                  </a>
                </div>
              </div>

              <div className="rounded-md border-2 border-[#e2e8f0] p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                    <IconoCorreo className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Enviar por correo</span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="email"
                    value={correoDestino}
                    onChange={(e) => setCorreoDestino(e.target.value)}
                    placeholder="correo@cliente.com"
                    className={CAMPO}
                  />
                  <button
                    type="button"
                    onClick={manejarEnviarCorreo}
                    disabled={enviandoCorreo}
                    className="rounded-md bg-slate-700 px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 dark:bg-slate-600"
                  >
                    {enviandoCorreo
                      ? 'Enviando…'
                      : correoEstado === 'enviado'
                        ? '✓ Correo enviado'
                        : 'Enviar correo'}
                  </button>
                  {correoEstado === 'error' && correoError && (
                    <p className="text-xs font-medium text-red-600">{correoError}</p>
                  )}
                </div>
              </div>

              <div className="rounded-md border-2 border-[#e2e8f0] p-4 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <IconoWhatsApp className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Enviar por WhatsApp</span>
                </div>
                <div className="mt-3 flex items-start gap-2">
                  <input
                    type="text"
                    value={codigoPaisWhatsapp}
                    onChange={(e) => setCodigoPaisWhatsapp(e.target.value)}
                    placeholder="+51"
                    className={`${CAMPO_SIN_ANCHO} w-14 shrink-0 text-center`}
                  />
                  <input
                    type="text"
                    value={telefonoWhatsapp}
                    onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                    placeholder="Número del cliente"
                    className={`${CAMPO_SIN_ANCHO} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={abrirWhatsApp}
                    title="Enviar por WhatsApp Web"
                    className="mt-1.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
                  >
                    <IconoWhatsApp className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
                  Se abrirá el chat en WhatsApp Web con el mensaje listo para enviar (recuerda tenerlo abierto y con
                  la sesión iniciada). El PDF no se adjunta automáticamente — el link a la cotización va incluido en
                  el mensaje.
                </p>
              </div>
            </div>
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
          opGravada={opGravada}
          opExonerada={opExonerada}
          opInafecta={opInafecta}
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
