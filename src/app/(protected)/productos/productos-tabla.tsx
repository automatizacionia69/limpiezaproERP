'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { cambiarEstadoProducto } from './actions'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  sku: string
  codigo_barras: string | null
  marca: string | null
  activo: boolean
  cantidad: number
  costo: number
  precio_venta: number | null
  punto_reorden: number | null
  categorias: { nombre: string } | null
  unidades_medida: { nombre: string } | null
}

type CampoOrden = 'cantidad' | 'precio_venta'
type Criterio = 'nombre' | 'categoria' | 'unidad' | 'sku' | 'codigo_barras'

const CRITERIOS: { valor: Criterio; etiqueta: string; placeholder: string }[] = [
  { valor: 'nombre', etiqueta: 'Nombre', placeholder: 'Buscar por nombre...' },
  { valor: 'categoria', etiqueta: 'Categoría', placeholder: 'Buscar por categoría...' },
  { valor: 'unidad', etiqueta: 'Unidad', placeholder: 'Buscar por unidad...' },
  { valor: 'sku', etiqueta: 'Código SKU', placeholder: 'Buscar por SKU (ej: LIM-0001)...' },
  { valor: 'codigo_barras', etiqueta: 'Código de barras', placeholder: 'Buscar por código de barras...' },
]

function valorSegunCriterio(p: ProductoRow, criterio: Criterio): string {
  switch (criterio) {
    case 'nombre':
      return p.nombre
    case 'categoria':
      return p.categorias?.nombre ?? ''
    case 'unidad':
      return p.unidades_medida?.nombre ?? ''
    case 'sku':
      return p.sku
    case 'codigo_barras':
      return p.codigo_barras ?? ''
  }
}

function IconoOrden({ activo, direccion }: { activo: boolean; direccion: 'asc' | 'desc' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className={`h-3.5 w-3.5 transition-transform ${activo ? 'text-indigo-600' : 'text-[#94a3b8] dark:text-slate-500'} ${
        activo && direccion === 'asc' ? 'rotate-180' : ''
      }`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function SelectorCriterio({ criterio, onChange }: { criterio: Criterio; onChange: (c: Criterio) => void }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  return (
    <div ref={ref} className="relative flex">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        title="Elegir criterio de búsqueda"
        className="flex items-center gap-1 rounded-r-2xl border-2 border-l-0 border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/60 px-3 text-xs font-bold text-[#64748b] dark:text-slate-400 transition-colors hover:bg-[#f1f5f9] dark:hover:bg-slate-800"
      >
        {CRITERIOS.find((c) => c.valor === criterio)?.etiqueta}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-1.5 shadow-xl">
          {CRITERIOS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => {
                onChange(c.valor)
                setAbierto(false)
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-800 ${
                criterio === c.valor ? 'bg-indigo-50 dark:bg-slate-800 font-bold text-indigo-700 dark:text-indigo-400' : 'text-[#1e293b] dark:text-slate-100'
              }`}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SwitchActivo({ producto }: { producto: ProductoRow }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function alternar() {
    setError(null)
    const nuevoValor = !producto.activo
    if (!nuevoValor) {
      const confirmado = confirm(
        `¿Desactivar "${producto.nombre}"? Dejará de aparecer en Ventas, Compras, Cotizaciones y Movimientos, pero sigue existiendo aquí y puedes reactivarlo cuando quieras.`
      )
      if (!confirmado) return
    }
    startTransition(async () => {
      try {
        await cambiarEstadoProducto(producto.id, nuevoValor)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado.')
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      <span className={`text-[11px] font-bold ${producto.activo ? 'text-emerald-600' : 'text-[#94a3b8] dark:text-slate-500'}`}>
        {producto.activo ? 'Activo' : 'Inactivo'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={producto.activo}
        disabled={isPending}
        onClick={alternar}
        title={producto.activo ? 'Desactivar producto' : 'Activar producto'}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          producto.activo ? 'bg-emerald-500' : 'bg-[#cbd5e1] dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            producto.activo ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function ProductosTabla({ productos }: { productos: ProductoRow[] }) {
  const [criterio, setCriterio] = useState<Criterio>('nombre')
  const [texto, setTexto] = useState('')
  const [orden, setOrden] = useState<{ campo: CampoOrden | null; direccion: 'asc' | 'desc' }>({
    campo: null,
    direccion: 'desc',
  })

  const placeholderActual = CRITERIOS.find((c) => c.valor === criterio)?.placeholder ?? 'Buscar...'

  function ordenarPor(campo: CampoOrden) {
    setOrden((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === 'desc' ? 'asc' : 'desc' }
        : { campo, direccion: 'desc' }
    )
  }

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase()
    const base = !q ? productos : productos.filter((p) => valorSegunCriterio(p, criterio).toLowerCase().includes(q))

    if (!orden.campo) return base

    const campo = orden.campo
    const signo = orden.direccion === 'desc' ? -1 : 1
    return [...base].sort((a, b) => {
      const valorA = campo === 'precio_venta' ? (a.precio_venta ?? -1) : a[campo]
      const valorB = campo === 'precio_venta' ? (b.precio_venta ?? -1) : b[campo]
      return (valorA - valorB) * signo
    })
  }, [productos, texto, criterio, orden])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📦 Productos</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
            {productos.length} producto{productos.length === 1 ? '' : 's'} en el inventario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-stretch">
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
                autoComplete="off"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={placeholderActual}
                className="h-full rounded-l-2xl border-2 border-r-0 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <SelectorCriterio
              criterio={criterio}
              onChange={(c) => {
                setCriterio(c)
                setTexto('')
              }}
            />
          </div>
          <Link
            href="/productos/nuevo"
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo producto
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        {productos.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">
            No hay registros. Usa el botón{' '}
            <Link href="/productos/nuevo" className="font-bold text-emerald-600">
              Nuevo producto
            </Link>{' '}
            para agregar el primero.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">Ningún producto coincide con “{texto}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-6 py-4 font-bold">Nombre</th>
                  <th className="px-6 py-4 font-bold">SKU</th>
                  <th className="px-6 py-4 font-bold">Código de barras</th>
                  <th className="px-6 py-4 font-bold">Marca</th>
                  <th className="px-6 py-4 font-bold">Categoría</th>
                  <th className="px-6 py-4 font-bold">Unidad</th>
                  <th className="px-6 py-4 font-bold">
                    <button
                      type="button"
                      onClick={() => ordenarPor('cantidad')}
                      className="inline-flex items-center gap-1 hover:text-indigo-600"
                      title="Ordenar por cantidad"
                    >
                      Cantidad
                      <IconoOrden activo={orden.campo === 'cantidad'} direccion={orden.direccion} />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-bold">Costo</th>
                  <th className="px-6 py-4 font-bold">
                    <button
                      type="button"
                      onClick={() => ordenarPor('precio_venta')}
                      className="inline-flex items-center gap-1 hover:text-indigo-600"
                      title="Ordenar por precio de venta"
                    >
                      Precio venta
                      <IconoOrden activo={orden.campo === 'precio_venta'} direccion={orden.direccion} />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                  <th className="px-6 py-4 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const bajo = p.punto_reorden !== null && p.cantidad <= p.punto_reorden
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100 transition-colors hover:bg-indigo-50/40 ${
                        p.activo ? '' : 'opacity-60'
                      }`}
                    >
                      <td className="px-6 py-4 font-bold">{p.nombre}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-[#1e293b] dark:text-slate-100">{p.sku}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#64748b] dark:text-slate-400">{p.codigo_barras ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{p.marca ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{p.categorias?.nombre ?? '—'}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">{p.unidades_medida?.nombre ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">{p.cantidad}</span>
                        {bajo && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Bajo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">S/ {Number(p.costo).toFixed(2)}</td>
                      <td className="px-6 py-4 text-[#64748b] dark:text-slate-400">
                        {p.precio_venta !== null ? `S/ ${Number(p.precio_venta).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <SwitchActivo producto={p} />
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/productos/${p.id}/kardex`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-amber-100 hover:text-amber-600"
                          title="Ver kardex"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 13.5V3.75m0 9.75a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V13.5M3 13.5h18M3 13.5l3.75-6.75L12 12l4.5-6 3 3.75"
                            />
                          </svg>
                        </Link>
                        <Link
                          href={`/productos/${p.id}/editar`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] dark:text-slate-400 transition-all hover:bg-indigo-100 hover:text-indigo-600"
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
                        {/*
                          Borrado físico intencionalmente sin botón: reservado para
                          administradores internos de nuestra empresa (ver
                          eliminarProductoFisico en actions.ts). El switch de la
                          columna Estado es la única forma de "quitar" un producto
                          del flujo normal del ERP.
                        */}
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
