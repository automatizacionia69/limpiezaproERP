'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { eliminarProducto } from './actions'

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
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [pendienteId, setPendienteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEliminar(id: number, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setErrorEliminar(null)
    setPendienteId(id)
    startTransition(async () => {
      try {
        await eliminarProducto(id)
      } catch (e) {
        setErrorEliminar(e instanceof Error ? e.message : 'No se pudo eliminar el producto.')
      } finally {
        setPendienteId(null)
      }
    })
  }

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">📦 Productos</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {productos.length} producto{productos.length === 1 ? '' : 's'} en el inventario
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              className="rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <Link
            href="/productos/nuevo"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo producto
          </Link>
        </div>
      </div>

      {errorEliminar && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorEliminar}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {productos.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">
            No hay registros. Usa el botón{' '}
            <Link href="/productos/nuevo" className="font-bold text-emerald-600">
              Nuevo producto
            </Link>{' '}
            para agregar el primero.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ningún producto coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-6 py-4 font-bold">Nombre</th>
                  <th className="px-6 py-4 font-bold">Código</th>
                  <th className="px-6 py-4 font-bold">Categoría</th>
                  <th className="px-6 py-4 font-bold">Unidad</th>
                  <th className="px-6 py-4 font-bold">Cantidad</th>
                  <th className="px-6 py-4 font-bold">Costo</th>
                  <th className="px-6 py-4 font-bold">Precio venta</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const bajo = p.punto_reorden !== null && p.cantidad <= p.punto_reorden
                  return (
                    <tr key={p.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4 font-bold">{p.nombre}</td>
                      <td className="px-6 py-4 text-[#64748b]">{p.codigo ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b]">{p.categorias?.nombre ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b]">{p.unidades_medida?.nombre ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">{p.cantidad}</span>
                        {bajo && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Bajo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#64748b]">S/ {Number(p.costo).toFixed(2)}</td>
                      <td className="px-6 py-4 text-[#64748b]">
                        {p.precio_venta !== null ? `S/ ${Number(p.precio_venta).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/productos/${p.id}/editar`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] transition-all hover:bg-indigo-100 hover:text-indigo-600"
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEliminar(p.id, p.nombre)}
                          disabled={isPending && pendienteId === p.id}
                          title="Eliminar"
                          className="ml-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
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
