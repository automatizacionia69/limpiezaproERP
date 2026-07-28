'use client'

import { useMemo, useState } from 'react'

const TIPO_BADGE: Record<string, string> = {
  entrada: 'bg-emerald-100 text-emerald-700',
  salida: 'bg-red-100 text-red-700',
  ajuste: 'bg-amber-100 text-amber-700',
}

const TIPO_EMOJI: Record<string, string> = {
  entrada: '📥',
  salida: '📤',
  ajuste: '⚖️',
}

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

type KardexRow = {
  id: number
  producto_nombre: string
  tipo: string
  cantidad: number
  costo_unitario: number | null
  saldo_cantidad: number
  usuario_nombre: string | null
  motivo: string | null
  creado_en: string
}

export function MovimientosTabla({ movimientos }: { movimientos: KardexRow[] }) {
  const [filtro, setFiltro] = useState('')

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return movimientos
    return movimientos.filter((m) =>
      [m.producto_nombre, TIPO_LABELS[m.tipo] ?? m.tipo, m.usuario_nombre, m.motivo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [movimientos, filtro])

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#f1f5f9] px-6 py-5">
        <h2 className="text-base font-extrabold text-[#1e293b]">🕒 Movimientos recientes</h2>
        {movimientos.length > 0 && (
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="rounded-2xl border-2 border-[#e2e8f0] bg-white py-2 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        )}
      </div>

      {movimientos.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b]">Todavía no hay movimientos registrados.</p>
      ) : filtrados.length === 0 ? (
        <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ningún movimiento coincide con “{filtro}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                <th className="px-6 py-4 font-bold">Fecha</th>
                <th className="px-6 py-4 font-bold">Producto</th>
                <th className="px-6 py-4 font-bold">Tipo</th>
                <th className="px-6 py-4 font-bold">Cantidad</th>
                <th className="px-6 py-4 font-bold">Costo unit.</th>
                <th className="px-6 py-4 font-bold">Saldo</th>
                <th className="px-6 py-4 font-bold">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => (
                <tr key={m.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-amber-50/40">
                  <td className="px-6 py-4 whitespace-nowrap text-[#64748b]">
                    {new Date(m.creado_en).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-6 py-4 font-bold">{m.producto_nombre}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        TIPO_BADGE[m.tipo] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {TIPO_EMOJI[m.tipo] ?? ''} {TIPO_LABELS[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">{m.cantidad}</td>
                  <td className="px-6 py-4 text-[#64748b]">
                    {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 font-semibold">{m.saldo_cantidad}</td>
                  <td className="px-6 py-4 text-[#64748b]">{m.usuario_nombre ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
