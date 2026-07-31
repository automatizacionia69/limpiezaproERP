'use client'

import { useState, useTransition } from 'react'
import { marcarCobrada } from './actions'
import type { FilaCobranza } from '@/lib/cobranzas'

const TIPO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  nota_venta: 'Nota de venta',
}

function Seccion({
  titulo,
  filas,
  tono,
  pendienteId,
  isPending,
  onMarcar,
}: {
  titulo: string
  filas: FilaCobranza[]
  tono: 'rojo' | 'ambar'
  pendienteId: number | null
  isPending: boolean
  onMarcar: (id: number, numero: string) => void
}) {
  if (filas.length === 0) return null

  const colorTitulo = tono === 'rojo' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
  const colorEtiqueta = tono === 'rojo' ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'

  return (
    <div className="mb-8">
      <h2 className={`mb-3 text-sm font-extrabold tracking-wide uppercase ${colorTitulo}`}>{titulo}</h2>
      <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Comprobante</th>
                <th className="px-6 py-4 font-bold">Saldo</th>
                <th className="px-6 py-4 font-bold">Vencimiento</th>
                <th className="px-6 py-4 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 font-bold">{f.cliente}</td>
                  <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                    {TIPO_LABELS[f.tipo] ?? f.tipo} {f.numero}
                  </td>
                  <td className="px-6 py-4 font-semibold">S/ {f.saldo.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-semibold ${colorEtiqueta}`}>{f.etiqueta}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onMarcar(f.id, f.numero)}
                      disabled={isPending && pendienteId === f.id}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Marcar cobrada
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function TablaCobranzas({ vencidas, porVencer }: { vencidas: FilaCobranza[]; porVencer: FilaCobranza[] }) {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">Cobranzas</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {vencidas.length + porVencer.length === 0
            ? 'No hay cobros pendientes'
            : `${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'} · ${porVencer.length} por vencer`}
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {vencidas.length === 0 && porVencer.length === 0 ? (
        <div className="rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-12 text-center">
          <p className="text-sm font-medium text-[#64748b] dark:text-slate-400">No hay cobros pendientes por ahora.</p>
        </div>
      ) : (
        <>
          <Seccion
            titulo="Vencidas"
            filas={vencidas}
            tono="rojo"
            pendienteId={pendienteId}
            isPending={isPending}
            onMarcar={handleMarcar}
          />
          <Seccion
            titulo="Por vencer (próximos 7 días)"
            filas={porVencer}
            tono="ambar"
            pendienteId={pendienteId}
            isPending={isPending}
            onMarcar={handleMarcar}
          />
        </>
      )}
    </div>
  )
}
