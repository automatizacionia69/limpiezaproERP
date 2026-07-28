'use client'

import { useMemo, useState, useTransition } from 'react'
import { recibirOrdenCompra, anularOrdenCompra } from './actions'

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  recibida: 'bg-emerald-50 text-emerald-700',
  anulada: 'bg-slate-100 text-slate-500',
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
    if (!q) return ordenes
    return ordenes.filter((o) =>
      [o.numero, o.proveedores?.nombre, ESTADO_LABELS[o.estado]]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [ordenes, filtro])

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-3 flex justify-end">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#64748b]"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar..."
            className="rounded-full border border-[#e2e8f0] bg-white py-2 pr-4 pl-9 text-[13.5px] text-[#1e293b] outline-none focus:border-[#4f46e5]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        {ordenes.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#64748b]">Todavía no hay órdenes de compra.</p>
        ) : filtradas.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#64748b]">Ninguna orden coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b]">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Proveedor</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((o) => (
                  <tr key={o.id} className="border-b border-[#f1f5f9] text-[#1e293b] hover:bg-[#f8fafc]">
                    <td className="px-5 py-3 font-medium">{o.numero}</td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {new Date(o.creado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-5 py-3">{o.proveedores?.nombre ?? '—'}</td>
                    <td className="px-5 py-3">S/ {Number(o.total).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ESTADO_BADGE[o.estado] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {o.estado === 'pendiente' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRecibir(o.id, o.numero)}
                            disabled={isPending && pendienteId === o.id}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Recibir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnular(o.id, o.numero)}
                            disabled={isPending && pendienteId === o.id}
                            className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
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
