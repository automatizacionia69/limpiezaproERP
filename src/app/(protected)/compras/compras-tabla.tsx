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

type Filtros = { proveedor: string; numero: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { proveedor: '', numero: '', desde: '', hasta: '' }

export function ComprasTabla({ ordenes }: { ordenes: OrdenRow[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)
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
    const proveedor = aplicado.proveedor.trim().toLowerCase()
    const numero = aplicado.numero.trim().toLowerCase()
    return ordenes.filter((o) => {
      const fecha = o.creado_en.slice(0, 10)
      const coincideProveedor = !proveedor || (o.proveedores?.nombre ?? '').toLowerCase().includes(proveedor)
      const coincideNumero = !numero || o.numero.toLowerCase().includes(numero)
      const coincideDesde = !aplicado.desde || fecha >= aplicado.desde
      const coincideHasta = !aplicado.hasta || fecha <= aplicado.hasta
      return coincideProveedor && coincideNumero && coincideDesde && coincideHasta
    })
  }, [ordenes, aplicado])

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
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] bg-white p-4">
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Proveedor</label>
          <input
            type="text"
            value={borrador.proveedor}
            onChange={(e) => setBorrador((b) => ({ ...b, proveedor: e.target.value }))}
            placeholder="Nombre del proveedor..."
            className="mt-1 w-48 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Número</label>
          <input
            type="text"
            value={borrador.numero}
            onChange={(e) => setBorrador((b) => ({ ...b, numero: e.target.value }))}
            placeholder="OC-00001..."
            className="mt-1 w-36 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-pink-500/30 transition-all hover:bg-pink-700"
        >
          🔍 Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-xl border-2 border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-bold text-[#64748b] transition-all hover:bg-[#f8fafc]"
          >
            Limpiar
          </button>
        )}
      </form>

      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {ordenes.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Todavía no hay órdenes de compra.</p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ninguna orden coincide con la búsqueda.</p>
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
