'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/modal'
import { obtenerDetalleSalida, type DetalleSalida } from './actions'
import { MOTIVOS_SALIDA, DOCUMENTOS_GRUPOS } from './constantes'

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS_SALIDA.map((m) => [m.valor, m.label]))
const DOCUMENTO_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENTOS_GRUPOS.flatMap((g) => g.opciones.map((o) => [o.valor, o.label]))
)

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-4 py-1 text-sm text-[#1e293b] dark:text-slate-100">
      <span className="text-[#64748b] dark:text-slate-400">{etiqueta}</span>
      <span className="text-right font-semibold">{valor}</span>
    </p>
  )
}

/** Popup con el detalle de una salida — reemplaza la navegación a una página aparte. */
export function DetalleSalidaModal({ salidaId, onCerrar }: { salidaId: number | null; onCerrar: () => void }) {
  const [detalle, setDetalle] = useState<DetalleSalida | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (salidaId === null) {
      setDetalle(null)
      setError(null)
      return
    }
    let cancelado = false
    obtenerDetalleSalida(salidaId).then((resultado) => {
      if (cancelado) return
      if ('error' in resultado) setError(resultado.error)
      else setDetalle(resultado.detalle)
    })
    return () => {
      cancelado = true
    }
  }, [salidaId])

  const esFinalizado = detalle?.estado === 'finalizado'
  const totalUnidades = detalle?.items.reduce((acc, it) => acc + Number(it.cantidad), 0) ?? 0
  const totalValor = detalle?.items.reduce((acc, it) => acc + Number(it.cantidad) * Number(it.costo_unitario ?? 0), 0) ?? 0
  const comprobante = detalle?.documento_tipo
    ? detalle.documento_tipo === 'otro'
      ? detalle.documento_otro
      : DOCUMENTO_LABELS[detalle.documento_tipo]
    : null
  const numeroDocumento = detalle ? [detalle.documento_serie, detalle.documento_correlativo].filter(Boolean).join('-') : ''

  return (
    <Modal abierto={salidaId !== null} onClose={onCerrar} className="max-w-3xl">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {!detalle && !error && (
        <p className="py-10 text-center text-sm font-medium text-[#94a3b8] dark:text-slate-500">Cargando salida...</p>
      )}

      {detalle && (
        <>
          {!esFinalizado && (
            <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-red-700 uppercase">
              🚫 Salida anulada
            </div>
          )}

          <div className="flex items-start justify-between gap-6 border-b-2 border-[#f1f5f9] dark:border-slate-800 pb-5">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl dark:bg-red-950/40">
                📤
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">Salida de mercadería</h2>
                <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">
                  Registrada el {new Date(detalle.creado_en).toLocaleString('es-PE')}
                </p>
                <p className="text-xs text-[#64748b] dark:text-slate-400">Responsable: {detalle.usuario_nombre ?? '—'}</p>
              </div>
            </div>
            <div className="w-40 shrink-0 rounded-xl border-2 border-[#1e293b] dark:border-slate-600 p-3 text-center">
              <p className="text-xs font-extrabold tracking-wide text-[#1e293b] dark:text-slate-100 uppercase">Salida</p>
              <p className="mt-1 text-base font-extrabold text-red-600">{detalle.numero}</p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                  esFinalizado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {esFinalizado ? 'FINALIZADO' : 'ANULADA'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Datos de la salida</p>
              <div className="mt-1.5 space-y-0.5 divide-y divide-dashed divide-[#e2e8f0] dark:divide-slate-800">
                <Fila etiqueta="Fecha de salida" valor={new Date(`${detalle.fecha}T00:00:00`).toLocaleDateString('es-PE')} />
                <Fila etiqueta="Motivo" valor={detalle.motivo === 'otro' ? detalle.motivo_otro : MOTIVO_LABELS[detalle.motivo] ?? detalle.motivo} />
                <Fila etiqueta="Responsable" valor={detalle.usuario_nombre ?? '—'} />
              </div>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
              <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Proveedor y documento</p>
              <div className="mt-1.5 space-y-0.5 divide-y divide-dashed divide-[#e2e8f0] dark:divide-slate-800">
                <Fila etiqueta="Proveedor" valor={detalle.proveedor_razon_social ?? '—'} />
                <Fila etiqueta="RUC" valor={detalle.proveedor_ruc ?? '—'} />
                <Fila etiqueta="Documento" valor={comprobante ?? 'Sin documento'} />
                {numeroDocumento && <Fila etiqueta="N° documento" valor={numeroDocumento} />}
              </div>
            </div>
            {detalle.observaciones && (
              <div className="rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4 sm:col-span-2">
                <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">Observaciones</p>
                <p className="mt-1.5 text-sm text-[#1e293b] dark:text-slate-100">{detalle.observaciones}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-[10px] font-bold tracking-wide text-[#94a3b8] dark:text-slate-500 uppercase">
            Ítems ({detalle.items.length})
          </p>
          <div className="mt-2 max-h-64 overflow-y-auto overflow-x-auto rounded-xl border border-[#e2e8f0] dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-4 py-2.5 font-bold">Producto</th>
                  {detalle.usa_lote_vencimiento && (
                    <>
                      <th className="px-4 py-2.5 font-bold">Lote</th>
                      <th className="px-4 py-2.5 font-bold">Vencimiento</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 text-right font-bold">Cantidad</th>
                  <th className="px-4 py-2.5 text-right font-bold">Costo unit.</th>
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((it) => (
                  <tr key={it.id} className="border-b border-[#f1f5f9] dark:border-slate-800 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-[#1e293b] dark:text-slate-100">{it.producto_nombre ?? '—'}</span>
                      {it.producto_codigo && <span className="ml-2 text-xs text-[#94a3b8] dark:text-slate-500">{it.producto_codigo}</span>}
                    </td>
                    {detalle.usa_lote_vencimiento && (
                      <>
                        <td className="px-4 py-2.5 text-[#64748b] dark:text-slate-400">{it.lote ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[#64748b] dark:text-slate-400">
                          {it.fecha_vencimiento ? new Date(`${it.fecha_vencimiento}T00:00:00`).toLocaleDateString('es-PE') : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">{it.cantidad}</td>
                    <td className="px-4 py-2.5 text-right text-[#1e293b] dark:text-slate-100">
                      S/ {Number(it.costo_unitario ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#1e293b] dark:text-slate-100">
                      S/ {(Number(it.cantidad) * Number(it.costo_unitario ?? 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
              <p className="flex justify-between text-sm text-[#64748b] dark:text-slate-400">
                <span>Unidades</span>
                <span className="font-semibold text-[#1e293b] dark:text-slate-100">{totalUnidades}</span>
              </p>
              <p className="flex justify-between border-t-2 border-[#1e293b] dark:border-slate-600 pt-2 text-lg font-extrabold text-red-600">
                <span>Valor total</span>
                <span>S/ {totalValor.toFixed(2)}</span>
              </p>
            </div>
          </div>

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
