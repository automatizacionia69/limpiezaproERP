'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { eliminarProveedor } from './actions'

type ProveedorRow = {
  id: number
  nombre: string
  ruc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
}

export function ProveedoresTabla({ proveedores }: { proveedores: ProveedorRow[] }) {
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
        await eliminarProveedor(id)
      } catch (e) {
        setErrorEliminar(e instanceof Error ? e.message : 'No se pudo eliminar el proveedor.')
      } finally {
        setPendienteId(null)
      }
    })
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return proveedores
    return proveedores.filter((p) =>
      [p.nombre, p.ruc, p.contacto, p.telefono, p.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [proveedores, filtro])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1e293b]">Proveedores</h1>
          <p className="mt-0.5 text-[13px] text-[#64748b]">
            {proveedores.length} proveedor{proveedores.length === 1 ? '' : 'es'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              className="rounded-full border border-[#e2e8f0] bg-white py-2 pr-4 pl-9 text-[13.5px] text-[#1e293b] outline-none focus:border-[#4f46e5]"
            />
          </div>
          <Link
            href="/proveedores/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4338ca]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Link>
        </div>
      </div>

      {errorEliminar && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errorEliminar}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        {proveedores.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#64748b]">
            No hay registros. Usa el botón{' '}
            <Link href="/proveedores/nuevo" className="font-medium text-[#4f46e5]">
              Nuevo
            </Link>{' '}
            para agregar el primero.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#64748b]">Ningún proveedor coincide con “{filtro}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b]">
                  <th className="px-5 py-3 font-medium">Razón social</th>
                  <th className="px-5 py-3 font-medium">RUC</th>
                  <th className="px-5 py-3 font-medium">Contacto</th>
                  <th className="px-5 py-3 font-medium">Teléfono</th>
                  <th className="px-5 py-3 font-medium">Correo</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-[#f1f5f9] text-[#1e293b] hover:bg-[#f8fafc]">
                    <td className="px-5 py-3 font-medium">{p.nombre}</td>
                    <td className="px-5 py-3 text-[#64748b]">{p.ruc ?? '—'}</td>
                    <td className="px-5 py-3 text-[#64748b]">{p.contacto ?? '—'}</td>
                    <td className="px-5 py-3 text-[#64748b]">{p.telefono ?? '—'}</td>
                    <td className="px-5 py-3 text-[#64748b]">{p.email ?? '—'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/proveedores/${p.id}/editar`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition-colors hover:bg-[#4f46e5]/10 hover:text-[#4f46e5]"
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
                      <button
                        type="button"
                        onClick={() => handleEliminar(p.id, p.nombre)}
                        disabled={isPending && pendienteId === p.id}
                        title="Eliminar"
                        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
