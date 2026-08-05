'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Modal } from '@/components/modal'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import type { FilaMovimiento } from './comprobantes-tabla'

const TIPO_BADGE: Record<string, string> = {
  factura: 'bg-lime-100 text-lime-700',
  boleta: 'bg-teal-100 text-teal-700',
  nota_venta: 'bg-slate-100 text-slate-600',
  ticket: 'bg-indigo-100 text-indigo-700',
}

function hrefVer(fila: FilaMovimiento) {
  if (fila.tipoMovimiento === 'nota_credito') return `/consulta-ventas/notas-credito/${fila.id}`
  if (fila.tipoMovimiento === 'nota_debito') return `/consulta-ventas/notas-debito/${fila.id}`
  return `/consulta-ventas/${fila.id}`
}

function etiquetaTipo(fila: FilaMovimiento) {
  if (fila.tipoMovimiento === 'nota_credito') return 'Nota de crédito'
  if (fila.tipoMovimiento === 'nota_debito') return 'Nota de débito'
  return TIPO_COMPROBANTE_LABELS[fila.tipo] ?? fila.tipo
}

function badgeTipo(fila: FilaMovimiento) {
  if (fila.tipoMovimiento === 'nota_credito') return 'bg-red-100 text-red-700'
  if (fila.tipoMovimiento === 'nota_debito') return 'bg-amber-100 text-amber-700'
  return TIPO_BADGE[fila.tipo] ?? 'bg-slate-100 text-slate-700'
}

export function ComprobanteModal({ fila, onClose }: { fila: FilaMovimiento | null; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false)

  function copiarNumero() {
    if (!fila) return
    navigator.clipboard.writeText(fila.numero).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  return (
    <Modal abierto={fila !== null} onClose={onClose}>
      {fila && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${badgeTipo(fila)}`}>{etiquetaTipo(fila)}</span>
              <h2 className="mt-2 text-xl font-extrabold text-[#1e293b] dark:text-slate-100">{fila.numero}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#64748b] transition-all hover:bg-[#f1f5f9] active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Cliente</p>
              <p className="mt-0.5 font-semibold text-[#1e293b] dark:text-slate-100">{fila.cliente ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Fecha</p>
              <p className="mt-0.5 font-semibold text-[#1e293b] dark:text-slate-100">
                {new Date(fila.fecha).toLocaleDateString('es-PE')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Monto</p>
              <p className="mt-0.5 font-bold text-[#1e293b] dark:text-slate-100">S/ {Math.abs(fila.monto).toFixed(2)}</p>
            </div>
            {fila.tipoMovimiento === 'comprobante' && (
              <div>
                <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Estado</p>
                <p className="mt-0.5 font-bold text-[#1e293b] dark:text-slate-100">
                  {fila.estado === 'emitido' ? '✅ Emitido' : '🚫 Anulado'}
                </p>
              </div>
            )}
            {fila.detalle && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase dark:text-slate-500">Detalle</p>
                <p className="mt-0.5 text-[#1e293b] dark:text-slate-100">{fila.detalle}</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <Link
              href={hrefVer(fila)}
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-lime-500 to-green-600 py-3 text-sm font-bold text-white shadow-md shadow-lime-500/30 transition-all active:scale-95"
            >
              📄 Ver documento completo / Imprimir
            </Link>

            {fila.tipoMovimiento === 'comprobante' && fila.estado === 'emitido' && (
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href={`/consulta-ventas/${fila.id}/nota-credito`}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 rounded-md border-2 border-[#e2e8f0] py-2.5 text-[11px] font-bold text-[#1e293b] transition-all hover:border-red-300 active:scale-95 dark:border-slate-700 dark:text-slate-100"
                >
                  <span className="text-base">🧾</span>N. Crédito
                </Link>
                <Link
                  href={`/consulta-ventas/${fila.id}/nota-debito`}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 rounded-md border-2 border-[#e2e8f0] py-2.5 text-[11px] font-bold text-[#1e293b] transition-all hover:border-amber-300 active:scale-95 dark:border-slate-700 dark:text-slate-100"
                >
                  <span className="text-base">➕</span>N. Débito
                </Link>
                <Link
                  href={`/consulta-ventas/${fila.id}/anular`}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 rounded-md border-2 border-[#e2e8f0] py-2.5 text-[11px] font-bold text-[#1e293b] transition-all hover:border-red-400 active:scale-95 dark:border-slate-700 dark:text-slate-100"
                >
                  <span className="text-base">🚫</span>Anular
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={copiarNumero}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#e2e8f0] py-3 text-sm font-bold text-[#64748b] transition-all hover:bg-[#f8fafc] active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {copiado ? '✅ Copiado' : '📋 Copiar número'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
