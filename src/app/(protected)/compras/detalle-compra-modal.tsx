'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/modal'
import { obtenerDetalleCompra, type DetalleCompra } from './actions'
import { IGV_TASA } from '@/lib/cotizaciones'

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

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  guia_remision: 'Guía de remisión',
}

/** Popup con el detalle de una orden de compra — reemplaza la navegación a una página aparte. */
export function DetalleCompraModal({ ordenId, onCerrar }: { ordenId: number | null; onCerrar: () => void }) {
  const [orden, setOrden] = useState<DetalleCompra | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ordenId === null) {
      setOrden(null)
      setError(null)
      return
    }
    let cancelado = false
    obtenerDetalleCompra(ordenId).then((resultado) => {
      if (cancelado) return
      if ('error' in resultado) {
        setError(resultado.error)
      } else {
        setOrden(resultado.orden)
      }
    })
    return () => {
      cancelado = true
    }
  }, [ordenId])

  return (
    <Modal abierto={ordenId !== null} onClose={onCerrar} className="max-w-3xl">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {!orden && !error && (
        <p className="py-10 text-center text-sm font-medium text-[#94a3b8] dark:text-slate-500">Cargando orden...</p>
      )}

      {orden && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#f1f5f9] dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">🛒 Orden {orden.numero}</h2>
              <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
                Creada el {new Date(orden.creado_en).toLocaleDateString('es-PE')}
                {orden.recibida_en && ` — recibida el ${new Date(orden.recibida_en).toLocaleDateString('es-PE')}`}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${ESTADO_BADGE[orden.estado] ?? 'bg-slate-100 text-slate-700'}`}
            >
              {ESTADO_EMOJI[orden.estado] ?? ''} {ESTADO_LABELS[orden.estado] ?? orden.estado}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Proveedor</p>
              <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">{orden.proveedor ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
                Documento del proveedor
              </p>
              <p className="mt-1 font-bold text-[#1e293b] dark:text-slate-100">
                {TIPO_DOCUMENTO_LABELS[orden.tipo_documento] ?? orden.tipo_documento}
                {orden.documento_serie && orden.documento_numero && (
                  <span className="ml-1">
                    {orden.documento_serie}-{orden.documento_numero}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-[#64748b] dark:text-slate-400">
                Fecha de registro: {new Date(`${orden.fecha_registro}T00:00:00`).toLocaleDateString('es-PE')}
              </p>
            </div>
          </div>

          {orden.lineas.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Productos</p>
              <div className="mt-2 max-h-64 overflow-y-auto overflow-x-auto rounded-xl border border-[#e2e8f0] dark:border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                      <th className="px-4 py-2.5 font-bold">SKU</th>
                      <th className="px-4 py-2.5 font-bold">Producto</th>
                      <th className="px-4 py-2.5 text-right font-bold">Cantidad</th>
                      <th className="px-4 py-2.5 text-right font-bold">Costo unitario</th>
                      <th className="px-4 py-2.5 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orden.lineas.map((l, i) => (
                      <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800 last:border-0">
                        <td className="px-4 py-2.5 text-[#64748b] dark:text-slate-400">{l.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-[#1e293b] dark:text-slate-100">{l.nombre ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">{l.cantidad}</td>
                        <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">
                          S/ {Number(l.costo_unitario).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#1e293b] dark:text-slate-100">
                          S/ {(l.cantidad * l.costo_unitario).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-1 text-right">
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  Subtotal (sin IGV): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {orden.subtotal.toFixed(2)}</span>
                </p>
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  IGV ({(IGV_TASA * 100).toFixed(0)}%): <span className="font-bold text-[#1e293b] dark:text-slate-100">S/ {orden.igv.toFixed(2)}</span>
                </p>
                <p className="text-lg font-extrabold text-pink-600">Total: S/ {orden.total.toFixed(2)}</p>
              </div>
            </div>
          )}

          {orden.observacion && (
            <p className="mt-6 rounded-xl bg-[#f8fafc] dark:bg-slate-800/60 px-4 py-3 text-sm text-[#64748b] dark:text-slate-400">
              {orden.observacion}
            </p>
          )}

          <button
            type="button"
            onClick={onCerrar}
            className="mt-6 w-full rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 py-3 text-sm font-bold text-[#64748b] dark:text-slate-400 transition-all active:scale-95"
          >
            Cerrar
          </button>
        </>
      )}
    </Modal>
  )
}
