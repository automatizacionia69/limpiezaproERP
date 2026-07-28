'use client'

import { useMemo, useState, useTransition } from 'react'
import { facturarOrdenVenta, anularOrdenVenta } from './actions'

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  facturada: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-slate-100 text-slate-500',
}

const ESTADO_EMOJI: Record<string, string> = {
  pendiente: '⏳',
  facturada: '✅',
  anulada: '🚫',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  facturada: 'Facturada',
  anulada: 'Anulada',
}

type OrdenRow = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  clientes: { nombre: string } | null
}

export function VentasTabla({ ordenes }: { ordenes: OrdenRow[] }) {
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFacturar(id: number, numero: string) {
    if (!confirm(`¿Facturar la orden ${numero}? Esto descontará el stock.`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await facturarOrdenVenta(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo facturar la orden.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  function handleAnular(id: number, numero: string) {
    if (!confirm(`¿Anular la orden ${numero}?`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await anularOrdenVenta(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo anular la orden.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return ordenes
    return ordenes.filter((o) =>
      [o.numero, o.clientes?.nombre, ESTADO_LABELS[o.estado]].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [ordenes, filtro])

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4 flex justify-end">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar..."
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {ordenes.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Todavía no hay órdenes de venta.</p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ninguna orden coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((o) => (
                  <tr key={o.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-teal-50/40">
                    <td className="px-6 py-4 font-bold">{o.numero}</td>
                    <td className="px-6 py-4 text-[#64748b]">
                      {new Date(o.creado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">{o.clientes?.nombre ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold">S/ {Number(o.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[o.estado] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {ESTADO_EMOJI[o.estado] ?? ''} {ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {o.estado === 'pendiente' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleFacturar(o.id, o.numero)}
                            disabled={isPending && pendienteId === o.id}
                            className="rounded-xl bg-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Facturar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnular(o.id, o.numero)}
                            disabled={isPending && pendienteId === o.id}
                            className="ml-2 rounded-xl bg-slate-100 px-4 py-2 text-[12px] font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-50"
                          >
                            Anular
                          </button>
                        </>
                      )}
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
