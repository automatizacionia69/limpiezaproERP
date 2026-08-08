'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { hoyPeruISO } from '@/lib/fecha'

type GuiaRow = {
  id: number
  numero: string
  fecha: string
  motivo: string
  direccion_despacho: string | null
  comprobantes: { numero: string; tipo: string; clientes: { nombre: string } | null } | null
}

function comprobanteDe(g: GuiaRow) {
  return Array.isArray(g.comprobantes) ? g.comprobantes[0] : g.comprobantes
}

function clienteDe(g: GuiaRow) {
  const comp = comprobanteDe(g)
  if (!comp) return null
  return Array.isArray(comp.clientes) ? comp.clientes[0] : comp.clientes
}

type Filtros = { cliente: string; numero: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { cliente: '', numero: '', desde: '', hasta: '' }

export function GuiasTabla({ guias }: { guias: GuiaRow[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)

  const filtradas = useMemo(() => {
    const cliente = aplicado.cliente.trim().toLowerCase()
    const numero = aplicado.numero.trim().toLowerCase()
    return guias.filter((g) => {
      const coincideCliente = !cliente || (clienteDe(g)?.nombre ?? '').toLowerCase().includes(cliente)
      const coincideNumero = !numero || g.numero.toLowerCase().includes(numero)
      const coincideDesde = !aplicado.desde || g.fecha >= aplicado.desde
      const coincideHasta = !aplicado.hasta || g.fecha <= aplicado.hasta
      return coincideCliente && coincideNumero && coincideDesde && coincideHasta
    })
  }, [guias, aplicado])

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
      <form
        onSubmit={buscar}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-4"
      >
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Cliente</label>
          <input
            type="text"
            value={borrador.cliente}
            onChange={(e) => setBorrador((b) => ({ ...b, cliente: e.target.value }))}
            placeholder="Nombre del cliente..."
            className="mt-1 w-48 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Número</label>
          <input
            type="text"
            value={borrador.numero}
            onChange={(e) => setBorrador((b) => ({ ...b, numero: e.target.value }))}
            placeholder="T006-000001..."
            className="mt-1 w-40 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100"
          />
        </div>
        <button
          type="button"
          onClick={filtrarHoy}
          className="mt-5 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-2.5 text-sm font-bold text-fuchsia-600 transition-all hover:bg-fuchsia-50 active:scale-95 dark:hover:bg-slate-800"
        >
          Hoy
        </button>
        <button
          type="submit"
          className="rounded-md bg-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-fuchsia-500/30 transition-all hover:bg-fuchsia-700 active:scale-95"
        >
          🔍 Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-5 py-2.5 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all hover:bg-[#f8fafc] dark:hover:bg-slate-800 active:scale-95"
          >
            Limpiar
          </button>
        )}
      </form>

      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        {guias.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Todavía no hay guías de remisión — se generan automáticamente al facturar una venta.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Ninguna guía coincide con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Comprobante</th>
                  <th className="px-6 py-4 font-bold">Dirección de despacho</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((g) => {
                  const comprobante = comprobanteDe(g)
                  const cliente = clienteDe(g)
                  return (
                    <tr
                      key={g.id}
                      className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-fuchsia-50/40 dark:hover:bg-fuchsia-950/20"
                    >
                      <td className="px-6 py-4 font-bold">{g.numero}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                        {new Date(`${g.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-6 py-4">
                        {cliente?.nombre ?? (
                          <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[11px] font-bold text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-400">
                            🔁 Traslado interno
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{comprobante?.numero ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                        {g.direccion_despacho || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/guias-remision/${g.id}`}
                          className="text-xs font-bold text-fuchsia-600 underline"
                        >
                          Ver / Editar
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
