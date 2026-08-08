'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { ComprobanteModal } from './comprobante-modal'
import { hoyPeruISO } from '@/lib/fecha'

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

// Franja de color a la izquierda de cada fila — escaneo rápido del estado
// sin depender solo del badge chico de la columna "Estado".
function BORDE_ESTADO(m: FilaMovimiento) {
  if (m.tipoMovimiento === 'nota_credito') return 'border-l-red-400'
  if (m.tipoMovimiento === 'nota_debito') return 'border-l-amber-400'
  return m.estado === 'anulado' ? 'border-l-red-400' : 'border-l-emerald-400'
}

function separarNumero(numero: string) {
  const idx = numero.indexOf('-')
  if (idx === -1) return { serie: numero, correlativo: '' }
  return { serie: numero.slice(0, idx), correlativo: numero.slice(idx + 1) }
}

type Filtros = { cliente: string; serie: string; numero: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { cliente: '', serie: '', numero: '', desde: '', hasta: '' }

export function ComprobantesTabla({ movimientos }: { movimientos: FilaMovimiento[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)
  const [filaModal, setFilaModal] = useState<FilaMovimiento | null>(null)

  const totalComprobantes = movimientos.filter((m) => m.tipoMovimiento === 'comprobante').length

  const filtrados = useMemo(() => {
    const cliente = aplicado.cliente.trim().toLowerCase()
    const serie = aplicado.serie.trim().toLowerCase()
    const numero = aplicado.numero.trim().toLowerCase()

    return movimientos.filter((m) => {
      const fecha = m.fecha.slice(0, 10)
      const { serie: serieFila, correlativo } = separarNumero(m.numero)
      const coincideCliente = !cliente || (m.cliente ?? '').toLowerCase().includes(cliente)
      const coincideSerie = !serie || serieFila.toLowerCase().includes(serie)
      const coincideNumero = !numero || correlativo.toLowerCase().includes(numero) || m.numero.toLowerCase().includes(numero)
      const coincideDesde = !aplicado.desde || fecha >= aplicado.desde
      const coincideHasta = !aplicado.hasta || fecha <= aplicado.hasta
      return coincideCliente && coincideSerie && coincideNumero && coincideDesde && coincideHasta
    })
  }, [movimientos, aplicado])

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🔎 Consulta de Ventas</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
            {totalComprobantes} comprobante{totalComprobantes === 1 ? '' : 's'} emitido{totalComprobantes === 1 ? '' : 's'}{' '}
            — incluye facturas, boletas, notas de venta y las notas de crédito/débito aplicadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/consulta-ventas/reporte-clientes"
            className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-sm font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:border-lime-300 hover:bg-lime-50 active:scale-95"
          >
            📊 Reporte ventas por cliente
          </Link>
          <Link
            href="/consulta-ventas/reporte-productos"
            className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-sm font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:border-lime-300 hover:bg-lime-50 active:scale-95"
          >
            📦 Reporte ventas por producto
          </Link>
        </div>
      </div>

      <form onSubmit={buscar} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-4">
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Cliente</label>
          <input
            type="text"
            value={borrador.cliente}
            onChange={(e) => setBorrador((b) => ({ ...b, cliente: e.target.value }))}
            placeholder="Nombre del cliente..."
            className="mt-1 w-44 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Serie</label>
          <input
            type="text"
            value={borrador.serie}
            onChange={(e) => setBorrador((b) => ({ ...b, serie: e.target.value }))}
            placeholder="F006, B006, NC01..."
            className="mt-1 w-32 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Número</label>
          <input
            type="text"
            value={borrador.numero}
            onChange={(e) => setBorrador((b) => ({ ...b, numero: e.target.value }))}
            placeholder="000001..."
            className="mt-1 w-32 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          />
        </div>
        <button
          type="button"
          onClick={filtrarHoy}
          className="mt-5 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-2.5 text-sm font-bold text-lime-600 transition-all hover:bg-lime-50 active:scale-95 dark:hover:bg-slate-800"
        >
          Hoy
        </button>
        <button
          type="submit"
          className="rounded-md bg-lime-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-lime-500/30 transition-all hover:bg-lime-700 active:scale-95"
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

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        {movimientos.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Todavía no hay comprobantes emitidos — factura una orden de venta desde el módulo Ventas.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Ningún movimiento coincide con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
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
                    className={`border-b border-l-4 border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-lime-50/40 dark:hover:bg-lime-950/10 ${BORDE_ESTADO(m)} ${
                      m.tipoMovimiento !== 'comprobante' ? 'bg-[#fbfbfd] dark:bg-slate-800/40' : ''
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
                      {m.detalle && <p className="mt-1 max-w-[220px] truncate text-[11px] text-[#94a3b8] dark:text-slate-500">{m.detalle}</p>}
                    </td>
                    <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{new Date(m.fecha).toLocaleDateString('es-PE')}</td>
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
                        <span className="text-[#94a3b8] dark:text-slate-500">—</span>
                      ) : m.totalNeto === m.monto ? (
                        <span className="text-[#94a3b8] dark:text-slate-500">—</span>
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
                        <span className="text-[#94a3b8] dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilaModal(m)}
                          title="Ver documento"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-50 text-lime-700 transition-all hover:bg-lime-100 active:scale-95 dark:bg-lime-950/40 dark:text-lime-400"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </button>

                        {m.tipoMovimiento === 'comprobante' && m.estado === 'emitido' && (
                          <>
                            <Link
                              href={`/consulta-ventas/${m.id}/nota-credito`}
                              title="Nota de crédito"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all hover:bg-red-100 active:scale-95 dark:bg-red-950/40 dark:text-red-400"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                />
                              </svg>
                            </Link>

                            <Link
                              href={`/consulta-ventas/${m.id}/nota-debito`}
                              title="Nota de débito"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:bg-amber-950/40 dark:text-amber-400"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                            </Link>

                            <Link
                              href={`/consulta-ventas/${m.id}/anular`}
                              title="Anular documento"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-all hover:bg-red-600 hover:text-white active:scale-95 dark:bg-slate-800 dark:text-slate-400"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ComprobanteModal fila={filaModal} onClose={() => setFilaModal(null)} />
    </div>
  )
}
