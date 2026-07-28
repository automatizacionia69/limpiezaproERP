'use client'

import { useMemo, useState, useTransition } from 'react'
import { recibirOrdenCompra, anularOrdenCompra } from './actions'

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  recibida: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-slate-100 text-slate-500',
}

const ESTADO_EMOJI: Record<string, string> = {
  pendiente: '⏳',
  recibida: '✅',
  anulada: '🚫',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  recibida: 'Recibida',
  anulada: 'Anulada',
}

type OrdenRow = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  proveedores: { nombre: string } | null
}

export function ComprasTabla({ ordenes }: { ordenes: OrdenRow[] }) {
  const [filtro, setFiltro] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRecibir(id: number, numero: string) {
    if (!confirm(`¿Marcar la orden ${numero} como recibida? Esto registrará las entradas de stock.`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await recibirOrdenCompra(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo recibir la orden.')
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
        await anularOrdenCompra(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo anular la orden.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return ordenes.filter((o) => {
      const fecha = o.creado_en.slice(0, 10)
      const coincideTexto =
        !q ||
        [o.numero, o.proveedores?.nombre, ESTADO_LABELS[o.estado]].filter(Boolean).join(' ').toLowerCase().includes(q)
      const coincideDesde = !desde || fecha >= desde
      const coincideHasta = !hasta || fecha <= hasta
      return coincideTexto && coincideDesde && coincideHasta
    })
  }, [ordenes, filtro, desde, hasta])

  const hayFiltros = filtro || desde || hasta

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por proveedor o número..."
            className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-[#64748b]">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-[#64748b]">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setFiltro('')
              setDesde('')
              setHasta('')
            }}
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748b] transition-all hover:bg-[#f8fafc]"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {ordenes.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Todavía no hay órdenes de compra.</p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ninguna orden coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Proveedor</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((o) => (
                  <tr key={o.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-pink-50/40">
                    <td className="px-6 py-4 font-bold">{o.numero}</td>
                    <td className="px-6 py-4 text-[#64748b]">
                      {new Date(o.creado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">{o.proveedores?.nombre ?? '—'}</td>
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
                            onClick={() => handleRecibir(o.id, o.numero)}
                            disabled={isPending && pendienteId === o.id}
                            className="rounded-xl bg-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Recibir
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
