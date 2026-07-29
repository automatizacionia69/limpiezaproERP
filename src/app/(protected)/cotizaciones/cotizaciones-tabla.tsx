'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { eliminarCotizacion, convertirCotizacionAVenta } from './actions'

type CotizacionRow = {
  id: number
  numero: string
  fecha: string
  total: number
  clientes: { nombre: string } | null
}

type Filtros = { cliente: string; numero: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { cliente: '', numero: '', desde: '', hasta: '' }

export function CotizacionesTabla({ cotizaciones }: { cotizaciones: CotizacionRow[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

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

  function handleConvertir(id: number, numero: string) {
    if (!confirm(`¿Convertir la cotización ${numero} en una orden de venta? Se creará como "pendiente".`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await convertirCotizacionAVenta(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo convertir la cotización.')
      } finally {
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
          className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-500/30 transition-all hover:bg-sky-700"
        >
          🔍 Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-5 py-2.5 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all hover:bg-[#f8fafc]"
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
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-600"
                        title="Ver / Descargar PDF"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleConvertir(c.id, c.numero)}
                        disabled={isPending && pendienteId === c.id}
                        title="Convertir a Venta"
                        className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-teal-100 hover:text-teal-600 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </button>
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
    </div>
  )
}
