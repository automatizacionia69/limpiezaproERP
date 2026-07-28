'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  costo: number
  precio_venta: number | null
  punto_reorden: number | null
  categorias: { nombre: string } | null
  unidades_medida: { nombre: string } | null
}

export function ProductosTabla({ productos }: { productos: ProductoRow[] }) {
  const [filtro, setFiltro] = useState('')

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) =>
      [p.nombre, p.codigo, p.categorias?.nombre, p.unidades_medida?.nombre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [productos, filtro])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#2b303a]">Productos</h1>
          <p className="mt-0.5 text-[13px] text-[#7a8290]">
            Gestión de Inventarios · {productos.length} producto{productos.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#7a8290]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="rounded-full border border-[#e8ebf1] bg-white py-2 pr-4 pl-9 text-[13.5px] text-[#2b303a] outline-none focus:border-[#e07a5f]"
            />
          </div>
          <Link
            href="/productos/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-[#e07a5f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c75f44]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e8ebf1] bg-white shadow-[0_1px_3px_rgba(31,37,51,.06)]">
        {productos.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#7a8290]">
            No hay registros. Usa el botón{' '}
            <Link href="/productos/nuevo" className="font-medium text-[#e07a5f]">
              Nuevo
            </Link>{' '}
            para agregar el primero.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#7a8290]">Ningún producto coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#e8ebf1] text-[#7a8290]">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Unidad</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 font-medium">Costo</th>
                  <th className="px-5 py-3 font-medium">Precio venta</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const bajo = p.punto_reorden !== null && p.cantidad <= p.punto_reorden
                  return (
                    <tr key={p.id} className="border-b border-[#f1f3f7] text-[#2b303a] hover:bg-[#f8f9fb]">
                      <td className="px-5 py-3 font-medium">{p.nombre}</td>
                      <td className="px-5 py-3 text-[#7a8290]">{p.codigo ?? '—'}</td>
                      <td className="px-5 py-3 text-[#7a8290]">{p.categorias?.nombre ?? '—'}</td>
                      <td className="px-5 py-3 text-[#7a8290]">{p.unidades_medida?.nombre ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span>{p.cantidad}</span>
                        {bajo && (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Bajo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#7a8290]">S/ {Number(p.costo).toFixed(2)}</td>
                      <td className="px-5 py-3 text-[#7a8290]">
                        {p.precio_venta !== null ? `S/ ${Number(p.precio_venta).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/productos/${p.id}/editar`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7a8290] transition-colors hover:bg-[#e07a5f]/10 hover:text-[#e07a5f]"
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
