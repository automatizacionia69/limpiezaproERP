'use client'

import { useState } from 'react'

type PuntoMes = { mes: string; ventas: number; compras: number }

const COLOR_VENTAS = '#2a78d6'
const COLOR_COMPRAS = '#eb6834'
const ALTURA_CHART = 200
const NIVELES_GRILLA = [1, 0.75, 0.5, 0.25, 0]

function formatearSoles(valor: number) {
  return `S/ ${valor.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}

export function VentasComprasChart({ datos }: { datos: PuntoMes[] }) {
  const [hover, setHover] = useState<{ mes: string; serie: 'Ventas' | 'Compras'; valor: number } | null>(null)

  const maxValor = Math.max(1, ...datos.flatMap((d) => [d.ventas, d.compras]))
  const hayDatos = datos.some((d) => d.ventas > 0 || d.compras > 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e9f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e9f0] dark:border-slate-700 px-7 py-5">
        <h2 className="text-base font-bold text-[#0f172a] dark:text-white">Ventas vs Compras — últimos 6 meses</h2>
        <div className="flex items-center gap-5 text-xs font-bold">
          <span className="flex items-center gap-2 text-[#1e293b] dark:text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_VENTAS }} />
            Ventas
          </span>
          <span className="flex items-center gap-2 text-[#1e293b] dark:text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_COMPRAS }} />
            Compras
          </span>
        </div>
      </div>

      <div className="px-7 py-8">
        {!hayDatos ? (
          <p className="py-16 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            Aún no hay ventas ni compras registradas en este periodo.
          </p>
        ) : (
          <div className="flex gap-6">
            <div
              className="flex flex-col justify-between text-right text-[11px] font-semibold text-[#94a3b8] dark:text-slate-500"
              style={{ height: ALTURA_CHART }}
            >
              {NIVELES_GRILLA.map((g) => (
                <span key={g}>{formatearSoles(maxValor * g)}</span>
              ))}
            </div>

            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col justify-between">
                {NIVELES_GRILLA.map((g) => (
                  <div key={g} className="border-t border-[#f1f5f9] dark:border-slate-800" />
                ))}
              </div>

              <div className="relative flex items-end justify-between gap-4" style={{ height: ALTURA_CHART }}>
                {datos.map((d) => (
                  <div key={d.mes} className="flex flex-1 flex-col items-center">
                    <div className="flex items-end gap-[2px]" style={{ height: ALTURA_CHART }}>
                      <div
                        onMouseEnter={() => setHover({ mes: d.mes, serie: 'Ventas', valor: d.ventas })}
                        onMouseLeave={() => setHover(null)}
                        className="w-5 cursor-default rounded-t-[4px] transition-opacity hover:opacity-80"
                        style={{ height: Math.max(2, (d.ventas / maxValor) * ALTURA_CHART), backgroundColor: COLOR_VENTAS }}
                      />
                      <div
                        onMouseEnter={() => setHover({ mes: d.mes, serie: 'Compras', valor: d.compras })}
                        onMouseLeave={() => setHover(null)}
                        className="w-5 cursor-default rounded-t-[4px] transition-opacity hover:opacity-80"
                        style={{ height: Math.max(2, (d.compras / maxValor) * ALTURA_CHART), backgroundColor: COLOR_COMPRAS }}
                      />
                    </div>
                    <span className="mt-2 text-[11px] font-bold text-[#64748b] dark:text-slate-400 capitalize">{d.mes}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex h-8 items-center justify-center">
          {hover ? (
            <span className="rounded-full bg-[#0f172a] px-4 py-1.5 text-xs font-bold text-white shadow-lg">
              {hover.serie} · {hover.mes}: {formatearSoles(hover.valor)}
            </span>
          ) : (
            <span className="text-xs font-medium text-[#cbd5e1]">Pasa el cursor sobre una barra para ver el detalle</span>
          )}
        </div>
      </div>
    </div>
  )
}
