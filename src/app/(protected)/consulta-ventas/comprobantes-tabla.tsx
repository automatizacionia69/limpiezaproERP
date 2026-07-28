'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'

export type FilaMovimiento = {
  id: number
  tipoMovimiento: 'comprobante' | 'nota_credito' | 'nota_debito'
  tipo: string
  numero: string
  fecha: string
  cliente: string | null
  monto: number
  totalNeto: number | null
  estado: string
  detalle: string | null
}

const TIPO_BADGE: Record<string, string> = {
  factura: 'bg-lime-100 text-lime-700',
  boleta: 'bg-teal-100 text-teal-700',
  nota_venta: 'bg-slate-100 text-slate-600',
  ticket: 'bg-indigo-100 text-indigo-700',
}

const ESTADO_BADGE: Record<string, string> = {
  emitido: 'bg-emerald-100 text-emerald-700',
  anulado: 'bg-red-100 text-red-700',
}

function hrefVer(fila: FilaMovimiento) {
  if (fila.tipoMovimiento === 'nota_credito') return `/consulta-ventas/notas-credito/${fila.id}`
  if (fila.tipoMovimiento === 'nota_debito') return `/consulta-ventas/notas-debito/${fila.id}`
  return `/consulta-ventas/${fila.id}`
}

export function ComprobantesTabla({ movimientos }: { movimientos: FilaMovimiento[] }) {
  const [filtro, setFiltro] = useState('')

  const totalComprobantes = movimientos.filter((m) => m.tipoMovimiento === 'comprobante').length

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return movimientos
    return movimientos.filter((m) =>
      [m.numero, m.cliente, TIPO_COMPROBANTE_LABELS[m.tipo], m.detalle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [movimientos, filtro])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">🔎 Consulta de Ventas</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {totalComprobantes} comprobante{totalComprobantes === 1 ? '' : 's'} emitido{totalComprobantes === 1 ? '' : 's'}{' '}
            — incluye facturas, boletas, notas de venta y las notas de crédito/débito aplicadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/consulta-ventas/reporte-clientes"
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-lime-300 hover:bg-lime-50"
          >
            📊 Reporte ventas por cliente
          </Link>
          <Link
            href="/consulta-ventas/reporte-productos"
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-lime-300 hover:bg-lime-50"
          >
            📦 Reporte ventas por producto
          </Link>
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
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {movimientos.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            Todavía no hay comprobantes emitidos — factura una orden de venta desde el módulo Ventas.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ningún movimiento coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Número</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Monto</th>
                  <th className="px-6 py-4 font-bold">Neto (comisionable)</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr
                    key={`${m.tipoMovimiento}-${m.id}`}
                    className={`border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-lime-50/40 ${
                      m.tipoMovimiento !== 'comprobante' ? 'bg-[#fbfbfd]' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-bold">{m.numero}</td>
                    <td className="px-6 py-4">
                      {m.tipoMovimiento === 'comprobante' ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TIPO_BADGE[m.tipo] ?? 'bg-slate-100 text-slate-700'}`}>
                          {TIPO_COMPROBANTE_LABELS[m.tipo] ?? m.tipo}
                        </span>
                      ) : m.tipoMovimiento === 'nota_credito' ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">Nota de crédito</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">Nota de débito</span>
                      )}
                      {m.detalle && <p className="mt-1 max-w-[220px] truncate text-[11px] text-[#94a3b8]">{m.detalle}</p>}
                    </td>
                    <td className="px-6 py-4 text-[#64748b]">{new Date(m.fecha).toLocaleDateString('es-PE')}</td>
                    <td className="px-6 py-4">{m.cliente ?? '—'}</td>
                    <td
                      className={`px-6 py-4 font-semibold ${
                        m.tipoMovimiento === 'nota_credito' ? 'text-red-600' : m.tipoMovimiento === 'nota_debito' ? 'text-amber-700' : ''
                      }`}
                    >
                      {m.tipoMovimiento === 'nota_debito' ? '+ ' : m.tipoMovimiento === 'nota_credito' ? '− ' : ''}
                      S/ {Math.abs(m.monto).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {m.totalNeto === null ? (
                        <span className="text-[#94a3b8]">—</span>
                      ) : m.totalNeto === m.monto ? (
                        <span className="text-[#94a3b8]">—</span>
                      ) : (
                        <span className="font-bold text-lime-700">S/ {m.totalNeto.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {m.tipoMovimiento === 'comprobante' ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[m.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                          {m.estado === 'emitido' ? '✅ Emitido' : '🚫 Anulado'}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={hrefVer(m)}
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
