'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { eliminarCotizacion, crearFacturaDesdeCotizacion, duplicarCotizacion, obtenerVistaCotizacion } from './actions'
import { Modal } from '@/components/modal'
import { CotizacionDocumento } from '@/components/cotizacion-documento'
import type { DatosDocumentoCotizacion } from '@/lib/cotizacion-documento-datos'

type CotizacionRow = {
  id: number
  numero: string
  fecha: string
  total: number
  estado: string
  clientes: { nombre: string } | null
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  convertida: 'bg-teal-100 text-teal-700',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  convertida: 'Convertida',
}

type Filtros = { cliente: string; numero: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { cliente: '', numero: '', desde: '', hasta: '' }

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

  function abrirVista(fila: CotizacionRow) {
    setVistaFila(fila)
    setVistaDatos(null)
    setVistaError(null)
    setVistaCargando(true)
    obtenerVistaCotizacion(fila.id)
      .then((datos) => setVistaDatos(datos))
      .catch((e) => setVistaError(e instanceof Error ? e.message : 'No se pudo cargar la cotización.'))
      .finally(() => setVistaCargando(false))
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

  const filtradas = useMemo(() => {
    const cliente = aplicado.cliente.trim().toLowerCase()
    const numero = aplicado.numero.trim().toLowerCase()
    return cotizaciones.filter((c) => {
      const coincideCliente = !cliente || (c.clientes?.nombre ?? '').toLowerCase().includes(cliente)
      const coincideNumero = !numero || c.numero.toLowerCase().includes(numero)
      const coincideDesde = !aplicado.desde || c.fecha >= aplicado.desde
      const coincideHasta = !aplicado.hasta || c.fecha <= aplicado.hasta
      return coincideCliente && coincideNumero && coincideDesde && coincideHasta
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
            <button
              type="button"
              onClick={() => descargarPdf(vistaFila.id)}
              className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 px-4 py-2 text-xs font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:bg-[#f8fafc] active:scale-95 dark:hover:bg-slate-800"
            >
              Descargar PDF
            </button>
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
