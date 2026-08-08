'use client'

import { useActionState, useMemo, useState } from 'react'
import { anularComprobante, type EstadoFormulario } from '../actions'
import { MOTIVOS_NOTA_CREDITO } from '@/lib/motivos'
import { calcularImportes } from '@/lib/cotizaciones'

type LineaVenta = {
  producto_id: number
  nombre: string
  cantidadVendida: number
  precioUnitario: number
  cantidadDisponible: number
}

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

export function AnularComprobanteForm({
  comprobanteId,
  numero,
  fechaEmision,
  totalComprobante,
  saldoDisponible,
  lineas,
  motivos = MOTIVOS_NOTA_CREDITO,
  comunicacionBaja = false,
}: {
  comprobanteId: number
  numero: string
  /** Solo se usa para mostrarla en el paso de Comunicación de Baja. */
  fechaEmision?: string
  totalComprobante: number
  /** Saldo aun acreditable: total + notas de debito − notas de credito previas. */
  saldoDisponible: number
  lineas: LineaVenta[]
  /** Subconjunto de motivos a ofrecer — filtrado por la página que lo usa (Nota de Crédito vs Anular). */
  motivos?: readonly (typeof MOTIVOS_NOTA_CREDITO)[number][]
  /** true en la página "Anular documento": pide el comentario de Comunicación de Baja. */
  comunicacionBaja?: boolean
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(anularComprobante, { error: null })
  const [codigoMotivo, setCodigoMotivo] = useState('')
  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [montoManual, setMontoManual] = useState('')
  const [comentarioBaja, setComentarioBaja] = useState('')

  const motivoInfo = motivos.find((m) => m.codigo === codigoMotivo)
  const requiereMontoManual = !!motivoInfo && !motivoInfo.anula && !motivoInfo.itemizable

  const lineasSeleccionadas = useMemo(
    () =>
      lineas
        .map((l) => ({ ...l, cantidad: Number(cantidades[l.producto_id] || 0) }))
        .filter((l) => l.cantidad > 0),
    [lineas, cantidades]
  )

  // El monto por item usa calcularImportes (precio_unitario con IGV
  // incluido, ver src/lib/cotizaciones.ts), la misma convencion que el
  // server action y que la anulacion total (totalComprobante).
  const monto = motivoInfo?.anula
    ? totalComprobante
    : motivoInfo?.itemizable
      ? calcularImportes(
          lineasSeleccionadas.map((l) => ({
            cantidad: l.cantidad,
            precio_unitario: l.precioUnitario,
          }))
        ).total
      : Number(montoManual || 0)

  const excedeSaldo = monto > saldoDisponible + 0.005

  const lineasJson = JSON.stringify(
    lineasSeleccionadas.map((l) => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
    }))
  )

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="comprobante_id" value={comprobanteId} />
      {motivoInfo?.itemizable && <input type="hidden" name="lineas" value={lineasJson} />}
      {requiereMontoManual && <input type="hidden" name="monto" value={monto} />}

      <div>
        <label className={LABEL}>Motivo *</label>
        <select
          name="motivo"
          required
          value={codigoMotivo}
          onChange={(e) => setCodigoMotivo(e.target.value)}
          className={CAMPO}
        >
          <option value="" disabled>
            Selecciona un motivo
          </option>
          {motivos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.label} {m.anula ? '· anula la operación' : m.itemizable ? '· por ítem' : ''}
            </option>
          ))}
        </select>
        {motivoInfo?.anula && (
          <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            ⚠️ Este motivo anula toda la factura N° {numero}: revierte el stock completo y ya no se podrá
            revertir.
          </p>
        )}
      </div>

      {comunicacionBaja && motivoInfo?.anula && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50/60 p-3.5 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-xs font-extrabold tracking-wide text-red-700 uppercase dark:text-red-400">
            📋 Comunicación de Baja
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#1e293b] dark:text-slate-100">
            <p>
              <span className="text-[#64748b] dark:text-slate-400">Documento:</span>{' '}
              <span className="font-bold">{numero}</span>
            </p>
            {fechaEmision && (
              <p>
                <span className="text-[#64748b] dark:text-slate-400">Fecha:</span>{' '}
                <span className="font-bold">{new Date(`${fechaEmision}T00:00:00`).toLocaleDateString('es-PE')}</span>
              </p>
            )}
          </div>
          <label className="mt-3 block text-xs font-bold text-[#1e293b] dark:text-slate-100">Comentario *</label>
          <textarea
            name="comentario_baja"
            required
            rows={3}
            placeholder="Motivo de la comunicación de baja..."
            value={comentarioBaja}
            onChange={(e) => setComentarioBaja(e.target.value)}
            className="mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#1e293b] outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-slate-700 dark:bg-[#141a2e] dark:text-slate-100"
          />
        </div>
      )}

      {motivoInfo?.itemizable && (
        <div className="rounded-xl border-2 border-red-100 bg-red-50/40 p-3">
          <p className="text-xs font-bold text-[#1e293b] dark:text-slate-100">Elige cuántas unidades de cada producto</p>
          <div className="mt-2 space-y-2">
            {lineas.map((l) => (
              <div key={l.producto_id} className="flex items-center gap-2 rounded-lg bg-white dark:bg-[#141a2e] p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#1e293b] dark:text-slate-100">{l.nombre}</p>
                  <p className="text-[10px] text-[#94a3b8] dark:text-slate-500">
                    Vendido: {l.cantidadVendida} · Disponible: {l.cantidadDisponible}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max={l.cantidadDisponible}
                  step="1"
                  placeholder="0"
                  disabled={l.cantidadDisponible <= 0}
                  value={cantidades[l.producto_id] ?? ''}
                  onChange={(e) => setCantidades((prev) => ({ ...prev, [l.producto_id]: e.target.value }))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-20 rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-2 py-1.5 text-xs text-[#1e293b] dark:text-slate-100 outline-none focus:border-red-500 disabled:bg-[#f8fafc] disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {requiereMontoManual && (
        <div>
          <label className={LABEL}>Monto de la nota de crédito (S/) *</label>
          <input
            type="number"
            min="0.01"
            max={totalComprobante}
            step="0.01"
            required
            placeholder="0.00"
            value={montoManual}
            onChange={(e) => setMontoManual(e.target.value)}
            className={CAMPO}
          />
        </div>
      )}

      {motivoInfo && (
        <div className="rounded-xl bg-[#f8fafc] dark:bg-slate-800/60 p-3 text-xs">
          <p className="flex justify-between text-[#64748b] dark:text-slate-400">
            <span>Total de la factura</span>
            <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {totalComprobante.toFixed(2)}</span>
          </p>
          {saldoDisponible < totalComprobante && (
            <p className="flex justify-between text-[#64748b] dark:text-slate-400">
              <span>Saldo pendiente (ya hay notas emitidas)</span>
              <span className="font-semibold text-[#1e293b] dark:text-slate-100">S/ {saldoDisponible.toFixed(2)}</span>
            </p>
          )}
          <p className="flex justify-between text-[#64748b] dark:text-slate-400">
            <span>Monto de esta nota de crédito</span>
            <span className="font-semibold text-red-600">− S/ {monto.toFixed(2)}</span>
          </p>
          <p className="mt-1 flex justify-between border-t border-[#e2e8f0] dark:border-slate-700 pt-1 font-bold text-[#1e293b] dark:text-slate-100">
            <span>Nuevo monto a pagar</span>
            <span>S/ {Math.max(0, saldoDisponible - monto).toFixed(2)}</span>
          </p>
          {excedeSaldo && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 font-bold text-red-700">
              El monto supera el saldo pendiente de S/ {saldoDisponible.toFixed(2)}.
            </p>
          )}
        </div>
      )}

      <div>
        <label className={LABEL}>Observación</label>
        <input type="text" name="observacion" placeholder="Detalle opcional" className={CAMPO} />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          !codigoMotivo ||
          (requiereMontoManual && monto <= 0) ||
          (comunicacionBaja && !comentarioBaja.trim())
        }
        className="w-full rounded-md bg-red-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-500/30 transition-all hover:bg-red-600 disabled:opacity-40 active:scale-95"
      >
        {comunicacionBaja ? 'Confirmar anulación' : 'Emitir nota de crédito'}
      </button>
    </form>
  )
}
