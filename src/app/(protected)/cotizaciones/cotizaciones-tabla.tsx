'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import {
  eliminarCotizacion,
  crearFacturaDesdeCotizacion,
  duplicarCotizacion,
  obtenerVistaCotizacion,
  enviarCorreoCotizacion,
} from './actions'
import { Modal } from '@/components/modal'
import { CotizacionDocumento } from '@/components/cotizacion-documento'
import type { DatosDocumentoCotizacion } from '@/lib/cotizacion-documento-datos'
import { hoyPeruISO } from '@/lib/fecha'

const CAMPO =
  'w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
// Igual que CAMPO pero sin `w-full` — para el código de país + número de
// WhatsApp en fila, donde el ancho lo define el propio flex (`w-14`/`flex-1`).
const CAMPO_SIN_ANCHO = CAMPO.replace('w-full ', '')

function IconoImprimir({ className }: { className?: string }) {
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
      <path d="M7 8.5V3.5h10v5" />
      <rect x="3" y="8.5" width="18" height="7.5" rx="2" />
      <circle cx="16.75" cy="11.25" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14.75" cy="11.25" r="0.6" fill="currentColor" stroke="none" />
      <path d="M7 13.5h10v7H7z" />
      <path d="M9 16h6M9 18h6M9 20h4" />
    </svg>
  )
}

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

type CotizacionRow = {
  id: number
  numero: string
  fecha: string
  total: number
  estado: string
  clientes: { nombre: string } | null
  vendedor: { nombre: string } | null
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  convertida: 'bg-teal-100 text-teal-700',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  convertida: 'Enviada',
}

type Filtros = { cliente: string; numero: string; desde: string; hasta: string; estado: string; vendedor: string }
const FILTROS_VACIOS: Filtros = { cliente: '', numero: '', desde: '', hasta: '', estado: '', vendedor: '' }

export function CotizacionesTabla({ cotizaciones }: { cotizaciones: CotizacionRow[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const [vistaFila, setVistaFila] = useState<CotizacionRow | null>(null)
  const [vistaDatos, setVistaDatos] = useState<DatosDocumentoCotizacion | null>(null)
  const [vistaCargando, setVistaCargando] = useState(false)
  const [vistaError, setVistaError] = useState<string | null>(null)

  const [codigoPaisWhatsapp, setCodigoPaisWhatsapp] = useState('+51')
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('')
  const [correoDestino, setCorreoDestino] = useState('')
  const [correoEstado, setCorreoEstado] = useState<'idle' | 'enviado' | 'error'>('idle')
  const [correoError, setCorreoError] = useState<string | null>(null)
  const [enviandoCorreo, iniciarEnvioCorreo] = useTransition()
  const [popoverAbierto, setPopoverAbierto] = useState<'correo' | 'whatsapp' | null>(null)

  function abrirVista(fila: CotizacionRow) {
    setVistaFila(fila)
    setVistaDatos(null)
    setVistaError(null)
    setVistaCargando(true)
    setPopoverAbierto(null)
    setCodigoPaisWhatsapp('+51')
    setTelefonoWhatsapp('')
    setCorreoDestino('')
    setCorreoEstado('idle')
    setCorreoError(null)
    obtenerVistaCotizacion(fila.id)
      .then((datos) => {
        setVistaDatos(datos)
        setTelefonoWhatsapp(datos.telefonoCliente?.replace(/\D/g, '') ?? '')
        setCorreoDestino(datos.emailCliente ?? '')
      })
      .catch((e) => setVistaError(e instanceof Error ? e.message : 'No se pudo cargar la cotización.'))
      .finally(() => setVistaCargando(false))
  }

  const mensajeCompartirCotizacion =
    vistaFila && vistaDatos
      ? `Hola${vistaDatos.cliente && vistaDatos.cliente !== '—' ? ' ' + vistaDatos.cliente : ''}, te comparto la cotización ${vistaFila.numero} por un total de ${
          vistaDatos.simbolo
        } ${vistaDatos.total.toFixed(2)}.`
      : ''
  const enlaceCotizacion =
    vistaFila && typeof window !== 'undefined' ? `${window.location.origin}/cotizaciones/${vistaFila.id}` : ''
  const mensajeConEnlace =
    mensajeCompartirCotizacion && enlaceCotizacion
      ? `${mensajeCompartirCotizacion}\n\nVer cotización: ${enlaceCotizacion}`
      : mensajeCompartirCotizacion

  function abrirWhatsApp() {
    const digitos = `${codigoPaisWhatsapp.replace(/\D/g, '')}${telefonoWhatsapp.replace(/\D/g, '')}`
    const url = `https://web.whatsapp.com/send?${
      digitos ? `phone=${digitos}&` : ''
    }text=${encodeURIComponent(mensajeConEnlace)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function manejarEnviarCorreo() {
    if (!vistaFila) return
    setCorreoEstado('idle')
    setCorreoError(null)
    iniciarEnvioCorreo(async () => {
      try {
        await enviarCorreoCotizacion(correoDestino, `Cotización ${vistaFila.numero}`, mensajeConEnlace)
        setCorreoEstado('enviado')
      } catch (error) {
        setCorreoError(error instanceof Error ? error.message : 'No se pudo enviar el correo.')
        setCorreoEstado('error')
      }
    })
  }

  // Descarga/imprime sin abrir pestaña: un iframe invisible carga la página
  // de impresión (que ya dispara sola el diálogo de imprimir/guardar vía
  // AutoImprimir) y se destruye solo al terminar — así no queda una pestaña
  // "cruda" del documento dando vueltas si el usuario cancela el diálogo.
  function descargarPdf(id: number) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '800px'
    iframe.style.height = '600px'
    iframe.style.border = '0'
    iframe.src = `/cotizaciones/${id}?formato=a4`

    const limpiar = () => iframe.remove()
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.addEventListener('afterprint', limpiar)
      // Salvavidas por si el navegador no dispara afterprint en el iframe.
      setTimeout(limpiar, 60_000)
    })
    document.body.appendChild(iframe)
  }

  function handleEliminar(id: number, numero: string) {
    if (!confirm(`¿Eliminar la cotización ${numero}? Esta acción no se puede deshacer.`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await eliminarCotizacion(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo eliminar la cotización.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  function handleCrearFactura(id: number, numero: string) {
    if (!confirm(`¿Crear la factura/boleta de la cotización ${numero}?`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await crearFacturaDesdeCotizacion(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo crear la factura.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  function handleDuplicar(id: number) {
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await duplicarCotizacion(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo duplicar la cotización.')
        setPendienteId(null)
      }
    })
  }

  const vendedoresUnicos = useMemo(() => {
    const nombres = new Set(cotizaciones.map((c) => c.vendedor?.nombre).filter((n): n is string => Boolean(n)))
    return Array.from(nombres).sort()
  }, [cotizaciones])

  const filtradas = useMemo(() => {
    const cliente = aplicado.cliente.trim().toLowerCase()
    const numero = aplicado.numero.trim().toLowerCase()
    return cotizaciones.filter((c) => {
      const coincideCliente = !cliente || (c.clientes?.nombre ?? '').toLowerCase().includes(cliente)
      const coincideNumero = !numero || c.numero.toLowerCase().includes(numero)
      const coincideDesde = !aplicado.desde || c.fecha >= aplicado.desde
      const coincideHasta = !aplicado.hasta || c.fecha <= aplicado.hasta
      const coincideEstado = !aplicado.estado || c.estado === aplicado.estado
      const coincideVendedor = !aplicado.vendedor || c.vendedor?.nombre === aplicado.vendedor
      return coincideCliente && coincideNumero && coincideDesde && coincideHasta && coincideEstado && coincideVendedor
    })
  }, [cotizaciones, aplicado])

  const hayFiltros = Object.values(aplicado).some(Boolean)

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    setAplicado(borrador)
  }

  function limpiar() {
    setBorrador(FILTROS_VACIOS)
    setAplicado(FILTROS_VACIOS)
  }

  function filtrarHoy() {
    const hoy = hoyPeruISO()
    setBorrador((b) => ({ ...b, desde: hoy, hasta: hoy }))
    setAplicado((a) => ({ ...a, desde: hoy, hasta: hoy }))
  }

  return (
    <div>
      <form onSubmit={buscar} className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-4">
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Cliente</label>
          <input
            type="text"
            value={borrador.cliente}
            onChange={(e) => setBorrador((b) => ({ ...b, cliente: e.target.value }))}
            placeholder="Nombre del cliente..."
            className="mt-1 w-48 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Número</label>
          <input
            type="text"
            value={borrador.numero}
            onChange={(e) => setBorrador((b) => ({ ...b, numero: e.target.value }))}
            placeholder="COT-00001..."
            className="mt-1 w-36 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <button
          type="button"
          onClick={filtrarHoy}
          className="mt-5 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-2.5 text-sm font-bold text-sky-600 transition-all hover:bg-sky-50 active:scale-95 dark:hover:bg-slate-800"
        >
          Hoy
        </button>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Estado</label>
          <select
            value={borrador.estado}
            onChange={(e) => setBorrador((b) => ({ ...b, estado: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="convertida">Enviada</option>
          </select>
        </div>
        {vendedoresUnicos.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Vendedor</label>
            <select
              value={borrador.vendedor}
              onChange={(e) => setBorrador((b) => ({ ...b, vendedor: e.target.value }))}
              className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">Todos</option>
              {vendedoresUnicos.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-500/30 transition-all hover:bg-sky-700 active:scale-95"
        >
          🔍 Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-5 py-2.5 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all hover:bg-[#f8fafc] active:scale-95"
          >
            Limpiar
          </button>
        )}
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        {cotizaciones.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Todavía no hay cotizaciones. Usa el botón{' '}
            <Link href="/cotizaciones/nueva" className="font-bold text-sky-600">
              Nueva cotización
            </Link>{' '}
            del menú para crear la primera.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Ninguna cotización coincide con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-sky-50/40">
                    <td className="px-6 py-4 font-bold">{c.numero}</td>
                    <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                      {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">{c.clientes?.nombre ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold">S/ {Number(c.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[c.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                        {ESTADO_LABELS[c.estado] ?? c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => abrirVista(c)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-600"
                        title="Ver"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                      {c.estado === 'pendiente' && (
                        <Link
                          href={`/cotizaciones/${c.id}/editar`}
                          className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-amber-100 hover:text-amber-600"
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 18.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDuplicar(c.id)}
                        disabled={isPending && pendienteId === c.id}
                        title="Duplicar"
                        className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-600 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5A2.25 2.25 0 0 1 18 21.75H6A2.25 2.25 0 0 1 3.75 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                          />
                        </svg>
                      </button>
                      {c.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => handleCrearFactura(c.id, c.numero)}
                          disabled={isPending && pendienteId === c.id}
                          title="Crear Factura"
                          className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-teal-100 hover:text-teal-600 disabled:opacity-50"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEliminar(c.id, c.numero)}
                        disabled={isPending && pendienteId === c.id}
                        title="Eliminar"
                        className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal abierto={vistaFila !== null} onClose={() => setVistaFila(null)} className="max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-4 pr-8">
          <p className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Vista previa</p>
          {vistaFila !== null && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => descargarPdf(vistaFila.id)}
                className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 px-4 py-2 text-xs font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:bg-[#f8fafc] active:scale-95 dark:hover:bg-slate-800"
              >
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => descargarPdf(vistaFila.id)}
                title="Imprimir"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500 text-white transition-all hover:bg-sky-600 active:scale-95"
              >
                <IconoImprimir className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPopoverAbierto((p) => (p === 'correo' ? null : 'correo'))}
                title="Enviar por correo"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500 text-white transition-all hover:bg-sky-600 active:scale-95"
              >
                <IconoCorreo className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPopoverAbierto((p) => (p === 'whatsapp' ? null : 'whatsapp'))}
                title="Enviar por WhatsApp"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white transition-all hover:bg-emerald-600 active:scale-95"
              >
                <IconoWhatsApp className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setVistaFila(null)}
            title="Cerrar"
            className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#64748b] transition-all hover:bg-[#f1f5f9] active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {popoverAbierto === 'correo' && (
          <div className="absolute right-4 top-16 z-20 w-72 rounded-md border-2 border-[#e2e8f0] bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-[#141a2e]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                <IconoCorreo className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Enviar por correo</span>
            </div>
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
              className="mt-2 w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-sky-600 active:scale-95 disabled:opacity-60"
            >
              {enviandoCorreo ? 'Enviando…' : correoEstado === 'enviado' ? '✓ Correo enviado' : 'Enviar correo'}
            </button>
            {correoEstado === 'error' && correoError && (
              <p className="mt-2 text-xs font-medium text-red-600">{correoError}</p>
            )}
          </div>
        )}

        {popoverAbierto === 'whatsapp' && (
          <div className="absolute right-4 top-16 z-20 w-72 rounded-md border-2 border-[#e2e8f0] bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-[#141a2e]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <IconoWhatsApp className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-[#1e293b] dark:text-slate-100">Enviar por WhatsApp</span>
            </div>
            <div className="flex items-start gap-2">
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
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
              >
                <IconoWhatsApp className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#94a3b8] dark:text-slate-500">
              Se abrirá el chat en WhatsApp Web con el mensaje listo para enviar (recuerda tenerlo abierto y con la
              sesión iniciada). El PDF no se adjunta automáticamente — el link a la cotización va incluido en el
              mensaje.
            </p>
          </div>
        )}

        {vistaCargando && (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Cargando…</p>
        )}
        {vistaError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {vistaError}
          </p>
        )}
        {vistaDatos && <CotizacionDocumento {...vistaDatos} />}
      </Modal>
    </div>
  )
}
