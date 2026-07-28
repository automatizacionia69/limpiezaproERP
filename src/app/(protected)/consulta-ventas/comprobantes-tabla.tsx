'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'

const TIPO_BADGE: Record<string, string> = {
  factura: 'bg-lime-100 text-lime-700',
  boleta: 'bg-teal-100 text-teal-700',
  nota_venta: 'bg-slate-100 text-slate-600',
}

const ESTADO_BADGE: Record<string, string> = {
  emitido: 'bg-emerald-100 text-emerald-700',
  anulado: 'bg-red-100 text-red-700',
}

type ComprobanteRow = {
  id: number
  tipo: string
  numero: string
  total: number
  totalNeto: number
  estado: string
  creado_en: string
  clientes: { nombre: string } | null
}

export function ComprobantesTabla({ comprobantes }: { comprobantes: ComprobanteRow[] }) {
  const [filtro, setFiltro] = useState('')

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return comprobantes
    return comprobantes.filter((c) =>
      [c.numero, c.clientes?.nombre, TIPO_COMPROBANTE_LABELS[c.tipo]]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [comprobantes, filtro])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">🔎 Consulta de Ventas</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {comprobantes.length} comprobante{comprobantes.length === 1 ? '' : 's'} emitido
            {comprobantes.length === 1 ? '' : 's'} — facturas, boletas y notas de venta
          </p>
        </div>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {comprobantes.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            Todavía no hay comprobantes emitidos — factura una orden de venta desde el módulo Ventas.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ningún comprobante coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Neto (comisionable)</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-lime-50/40">
                    <td className="px-6 py-4 font-bold">{c.numero}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TIPO_BADGE[c.tipo] ?? 'bg-slate-100 text-slate-700'}`}>
                        {TIPO_COMPROBANTE_LABELS[c.tipo] ?? c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748b]">{new Date(c.creado_en).toLocaleDateString('es-PE')}</td>
                    <td className="px-6 py-4">{c.clientes?.nombre ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold">S/ {Number(c.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {c.totalNeto === c.total ? (
                        <span className="text-[#94a3b8]">—</span>
                      ) : (
                        <span className="font-bold text-lime-700">S/ {c.totalNeto.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[c.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                        {c.estado === 'emitido' ? '✅ Emitido' : '🚫 Anulado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/consulta-ventas/${c.id}`}
                        className="rounded-xl bg-lime-50 px-4 py-2 text-[12px] font-bold text-lime-700 transition-all hover:bg-lime-100"
                      >
                        Ver
                      </Link>
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
