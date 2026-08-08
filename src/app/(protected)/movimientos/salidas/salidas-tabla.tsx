'use client'

import { useMemo, useState } from 'react'
import { MOTIVOS_SALIDA, DOCUMENTOS_GRUPOS } from './constantes'
import { DetalleSalidaModal } from './detalle-salida-modal'

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS_SALIDA.map((m) => [m.valor, m.label]))
const DOCUMENTO_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENTOS_GRUPOS.flatMap((g) => g.opciones.map((o) => [o.valor, o.label]))
)

const ESTADO_BADGE: Record<string, string> = {
  finalizado: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-red-100 text-red-700',
}

export type SalidaCabeceraRow = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivoOtro: string | null
  documentoTipo: string | null
  documentoOtro: string | null
  documentoSerie: string | null
  documentoCorrelativo: string | null
  proveedor: string | null
  estado: string
  usuarioNombre: string | null
  numeroLineas: number
  cantidadItems: number
}

export function SalidasTabla({ salidas }: { salidas: SalidaCabeceraRow[] }) {
  const [filtro, setFiltro] = useState('')
  const [verId, setVerId] = useState<number | null>(null)

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return salidas
    return salidas.filter((e) =>
      [e.numero, e.usuarioNombre, MOTIVO_LABELS[e.motivo] ?? e.motivo, e.proveedor]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [salidas, filtro])

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#f1f5f9] dark:border-slate-800 px-6 py-5">
        <h2 className="text-base font-extrabold text-[#1e293b] dark:text-slate-100">🕒 Salidas registradas</h2>
        {salidas.length > 0 && (
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
              className="rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-2 pr-4 pl-10 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </div>
        )}
      </div>

      {salidas.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Todavía no hay salidas registradas.</p>
      ) : filtradas.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Ninguna salida coincide con “{filtro}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                <th className="px-6 py-4 font-bold">Código</th>
                <th className="px-6 py-4 font-bold">F. Salida</th>
                <th className="px-6 py-4 font-bold">Responsable</th>
                <th className="px-6 py-4 font-bold">Motivo</th>
                <th className="px-6 py-4 font-bold">Comprobante</th>
                <th className="px-6 py-4 font-bold">Proveedor</th>
                <th className="px-6 py-4 font-bold">N° Líneas</th>
                <th className="px-6 py-4 font-bold">Cant. Ítems</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => {
                const comprobante = e.documentoTipo
                  ? (e.documentoTipo === 'otro' ? e.documentoOtro : DOCUMENTO_LABELS[e.documentoTipo]) +
                    (e.documentoSerie ? ` ${e.documentoSerie}-${e.documentoCorrelativo ?? ''}` : '')
                  : '—'
                return (
                  <tr
                    key={e.id}
                    className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-red-50/40"
                  >
                    <td className="px-6 py-4 font-bold whitespace-nowrap">{e.numero}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#64748b] dark:text-slate-400">
                      {new Date(`${e.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">{e.usuarioNombre ?? '—'}</td>
                    <td className="px-6 py-4">{e.motivo === 'otro' ? e.motivoOtro : MOTIVO_LABELS[e.motivo] ?? e.motivo}</td>
                    <td className="px-6 py-4">{comprobante}</td>
                    <td className="px-6 py-4">{e.proveedor ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold">{e.numeroLineas}</td>
                    <td className="px-6 py-4 font-semibold">{e.cantidadItems}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_BADGE[e.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                        {e.estado === 'finalizado' ? 'FINALIZADO' : 'ANULADA'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setVerId(e.id)}
                        title="Ver salida"
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:hover:bg-red-950/40"
                      >
                        👁️ Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DetalleSalidaModal salidaId={verId} onCerrar={() => setVerId(null)} />
    </div>
  )
}
