'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { eliminarCotizacion } from './actions'

type CotizacionRow = {
  id: number
  numero: string
  fecha: string
  total: number
  clientes: { nombre: string } | null
}

export function CotizacionesTabla({ cotizaciones }: { cotizaciones: CotizacionRow[] }) {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
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

  const filtradas = useMemo(() => {
    return cotizaciones.filter((c) => {
      const coincideCliente =
        !filtroCliente.trim() ||
        [c.numero, c.clientes?.nombre].filter(Boolean).join(' ').toLowerCase().includes(filtroCliente.trim().toLowerCase())
      const coincideFecha = !filtroFecha || c.fecha === filtroFecha
      return coincideCliente && coincideFecha
    })
  }, [cotizaciones, filtroCliente, filtroFecha])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            placeholder="Buscar por cliente o número..."
            className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        {(filtroCliente || filtroFecha) && (
          <button
            type="button"
            onClick={() => {
              setFiltroCliente('')
              setFiltroFecha('')
            }}
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748b] transition-all hover:bg-[#f8fafc]"
          >
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {cotizaciones.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            Todavía no hay cotizaciones. Usa el botón{' '}
            <Link href="/cotizaciones/nueva" className="font-bold text-sky-600">
              Nueva cotización
            </Link>{' '}
            del menú para crear la primera.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            Ninguna cotización coincide con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-sky-50/40">
                    <td className="px-6 py-4 font-bold">{c.numero}</td>
                    <td className="px-6 py-4 text-[#64748b]">
                      {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">{c.clientes?.nombre ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold">S/ {Number(c.total).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] transition-all hover:bg-sky-100 hover:text-sky-600"
                        title="Ver / Descargar PDF"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEliminar(c.id, c.numero)}
                        disabled={isPending && pendienteId === c.id}
                        title="Eliminar"
                        className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
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
