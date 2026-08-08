'use client'

import { useMemo, useState } from 'react'
import { MOTIVOS_AJUSTE } from './constantes'
import { DetalleAjusteModal } from './detalle-ajuste-modal'

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS_AJUSTE.map((m) => [m.valor, m.label]))

const ESTADO_BADGE: Record<string, string> = {
  finalizado: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-red-100 text-red-700',
}

export type AjusteCabeceraRow = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivoOtro: string | null
  estado: string
  usuarioNombre: string | null
  numeroLineas: number
  diferenciaNeta: number
}

export function AjustesTabla({ ajustes }: { ajustes: AjusteCabeceraRow[] }) {
  const [filtro, setFiltro] = useState('')
  const [verId, setVerId] = useState<number | null>(null)

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return ajustes
    return ajustes.filter((e) =>
      [e.numero, e.usuarioNombre, MOTIVO_LABELS[e.motivo] ?? e.motivo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [ajustes, filtro])

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#f1f5f9] dark:border-slate-800 px-6 py-5">
        <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">🕒 Ajustes registrados</h2>
        {ajustes.length > 0 && (
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8] dark:text-slate-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-2 pr-4 pl-10 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        )}
      </div>

      {ajustes.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Todavía no hay ajustes registrados.</p>
      ) : filtradas.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Ningún ajuste coincide con “{filtro}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                <th className="px-6 py-4 font-bold">Código</th>
                <th className="px-6 py-4 font-bold">Fecha</th>
                <th className="px-6 py-4 font-bold">Responsable</th>
                <th className="px-6 py-4 font-bold">Motivo</th>
                <th className="px-6 py-4 font-bold">N° Líneas</th>
                <th className="px-6 py-4 font-bold">Diferencia neta</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-amber-50/40"
                >
                  <td className="px-6 py-4 font-bold whitespace-nowrap">{e.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#64748b] dark:text-slate-400">
                    {new Date(`${e.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-6 py-4">{e.usuarioNombre ?? '—'}</td>
                  <td className="px-6 py-4">{e.motivo === 'otro' ? e.motivoOtro : MOTIVO_LABELS[e.motivo] ?? e.motivo}</td>
                  <td className="px-6 py-4 font-semibold">{e.numeroLineas}</td>
                  <td
                    className={`px-6 py-4 font-semibold ${
                      e.diferenciaNeta > 0 ? 'text-emerald-600' : e.diferenciaNeta < 0 ? 'text-red-600' : ''
                    }`}
                  >
                    {e.diferenciaNeta > 0 ? '+' : ''}
                    {e.diferenciaNeta}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[e.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                      {e.estado === 'finalizado' ? 'FINALIZADO' : 'ANULADA'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setVerId(e.id)}
                      title="Ver ajuste"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/40"
                    >
                      👁️ Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetalleAjusteModal ajusteId={verId} onCerrar={() => setVerId(null)} />
    </div>
  )
}
