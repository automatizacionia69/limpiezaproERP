'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-rose-100 text-rose-700',
  almacen: 'bg-indigo-100 text-indigo-700',
  ventas: 'bg-teal-100 text-teal-700',
}

type UsuarioRow = { id: string; nombre: string; rol: string }

export function UsuariosTabla({ usuarios }: { usuarios: UsuarioRow[] }) {
  const [filtro, setFiltro] = useState('')

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => u.nombre.toLowerCase().includes(q))
  }, [usuarios, filtro])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">👥 Usuarios</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {usuarios.length} usuario{usuarios.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#94a3b8]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="rounded-2xl border-2 border-[#e2e8f0] bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-[#1e293b] outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
            />
          </div>
          <Link
            href="/usuarios/nuevo"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo usuario
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        {usuarios.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">No hay usuarios registrados.</p>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">Ningún usuario coincide con “{filtro}”.</p>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                <th className="px-6 py-4 font-bold">Nombre</th>
                <th className="px-6 py-4 font-bold">Rol</th>
                <th className="px-6 py-4 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="border-b border-[#f1f5f9] text-[#1e293b] transition-colors hover:bg-rose-50/40">
                  <td className="px-6 py-4 font-bold">{u.nombre}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_BADGE[u.rol] ?? 'bg-slate-100 text-slate-700'}`}>
                      {ROLE_LABELS[u.rol] ?? u.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/usuarios/${u.id}/editar`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] transition-all hover:bg-rose-100 hover:text-rose-600"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
