'use client'

import { useMemo, useState } from 'react'

const TIPO_BADGE: Record<string, string> = {
  entrada: 'bg-emerald-50 text-emerald-700',
  salida: 'bg-red-50 text-red-700',
  ajuste: 'bg-amber-50 text-amber-700',
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
    <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#1e293b]">Movimientos recientes</h2>
        {movimientos.length > 0 && (
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#64748b]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="rounded-full border border-[#e2e8f0] bg-white py-1.5 pr-4 pl-9 text-[13px] text-[#1e293b] outline-none focus:border-[#4f46e5]"
            />
          </div>
        )}
      </div>

      {movimientos.length === 0 ? (
        <p className="p-10 text-center text-sm text-[#64748b]">Todavía no hay movimientos registrados.</p>
      ) : filtrados.length === 0 ? (
        <p className="p-10 text-center text-sm text-[#64748b]">Ningún movimiento coincide con “{filtro}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[#64748b]">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Cantidad</th>
                <th className="px-5 py-3 font-medium">Costo unit.</th>
                <th className="px-5 py-3 font-medium">Saldo</th>
                <th className="px-5 py-3 font-medium">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => (
                <tr key={m.id} className="border-b border-[#f1f5f9] text-[#1e293b] hover:bg-[#f8fafc]">
                  <td className="px-5 py-3 whitespace-nowrap text-[#64748b]">
                    {new Date(m.creado_en).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-5 py-3 font-medium">{m.producto_nombre}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        TIPO_BADGE[m.tipo] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {TIPO_LABELS[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3">{m.cantidad}</td>
                  <td className="px-5 py-3 text-[#64748b]">
                    {m.costo_unitario !== null ? `S/ ${Number(m.costo_unitario).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3">{m.saldo_cantidad}</td>
                  <td className="px-5 py-3 text-[#64748b]">{m.usuario_nombre ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
