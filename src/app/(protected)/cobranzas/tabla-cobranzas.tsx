'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { marcarCobrada } from './actions'
import { DescargarExcelBoton } from '@/components/descargar-excel-boton'
import type { FilaCobranza } from '@/lib/cobranzas'
import { hoyPeruISO } from '@/lib/fecha'

const TIPO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  nota_venta: 'Nota de venta',
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
  cobrado: 'bg-emerald-100 text-emerald-700',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  cobrado: 'Cobrado',
}

type Filtros = { cliente: string; desde: string; hasta: string }
const FILTROS_VACIOS: Filtros = { cliente: '', desde: '', hasta: '' }

export function TablaCobranzas({ filas }: { filas: FilaCobranza[] }) {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_VACIOS)
  const [error, setError] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMarcar(id: number, numero: string) {
    if (!confirm(`¿Marcar ${numero} como cobrada?`)) return
    setError(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await marcarCobrada(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo marcar como cobrada.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  const filtradas = useMemo(() => {
    const cliente = aplicado.cliente.trim().toLowerCase()
    return filas.filter((f) => {
      const coincideCliente = !cliente || f.cliente.toLowerCase().includes(cliente)
      const coincideDesde = !aplicado.desde || f.fechaVencimientoISO >= aplicado.desde
      const coincideHasta = !aplicado.hasta || f.fechaVencimientoISO <= aplicado.hasta
      return coincideCliente && coincideDesde && coincideHasta
    })
  }, [filas, aplicado])

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

  const filasVencidas = filas.filter((f) => f.estado === 'vencida')
  const vencidas = filasVencidas.length
  const pendientes = filas.filter((f) => f.estado === 'pendiente').length

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">Cobranzas</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
            {vencidas} vencida{vencidas === 1 ? '' : 's'} · {pendientes} pendiente{pendientes === 1 ? '' : 's'}
          </p>
        </div>
        {vencidas > 0 && (
          <DescargarExcelBoton
            nombreArchivo={`cobranzas-vencidas-${new Date().toISOString().slice(0, 10)}.xlsx`}
            hoja="Facturas vencidas"
            encabezados={['Fecha emisión', 'Vencimiento', 'RUC/DNI', 'Cliente', 'Monto sin IGV', 'Monto con IGV']}
            filas={filasVencidas.map((f) => [
              f.fechaEmisionLabel,
              f.fechaVencimientoLabel,
              f.clienteDocumento,
              f.cliente,
              f.montoSinIgv,
              f.montoConIgv,
            ])}
            colorEncabezado="FFDC2626"
            className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-500/30 transition-all hover:bg-red-700 active:scale-95"
          >
            Descargar vencidas (Excel)
          </DescargarExcelBoton>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

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
            className="mt-1 w-48 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Vence desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Vence hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2.5 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <button
          type="button"
          onClick={filtrarHoy}
          title="Vence hoy"
          className="mt-5 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-2.5 text-sm font-bold text-indigo-600 transition-all hover:bg-indigo-50 active:scale-95 dark:hover:bg-slate-800"
        >
          Hoy
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-95"
        >
          Buscar
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

      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            No hay comprobantes a crédito todavía.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Ninguno coincide con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Comprobante</th>
                  <th className="px-6 py-4 font-bold">Saldo</th>
                  <th className="px-6 py-4 font-bold">Emisión</th>
                  <th className="px-6 py-4 font-bold">Vencimiento</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4 font-bold">{f.cliente}</td>
                    <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>
                          {TIPO_LABELS[f.tipo] ?? f.tipo} {f.numero}
                        </span>
                        <Link
                          href={`/consulta-ventas/${f.id}`}
                          title="Ver comprobante"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-slate-800"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">S/ {f.saldo.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{f.fechaEmisionLabel}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{f.fechaVencimientoLabel}</div>
                      <div className="text-xs text-[#64748b] dark:text-slate-400">{f.diasLabel}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[f.estado]}`}>
                        {ESTADO_LABELS[f.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {f.estado !== 'cobrado' && (
                        <button
                          type="button"
                          onClick={() => handleMarcar(f.id, f.numero)}
                          disabled={isPending && pendienteId === f.id}
                          className="rounded-md bg-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:opacity-50 active:scale-95"
                        >
                          Marcar cobrada
                        </button>
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
