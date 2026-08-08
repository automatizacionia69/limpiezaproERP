'use client'

import { useActionState, useState } from 'react'
import { editarUsuario, type EstadoFormulario } from '../../actions'
import { MODULOS } from '@/lib/modulos'

type Usuario = { id: string; nombre: string; rol: string; dni: string | null; brevete: string | null }

const CAMPO =
  'mt-1.5 w-full rounded-lg border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
const LABEL = 'block text-xs font-bold text-[#1e293b] dark:text-slate-100'

export function EditarUsuarioForm({
  usuario,
  modulosActivos,
}: {
  usuario: Usuario
  modulosActivos: string[]
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarUsuario, {
    error: null,
  })
  const [rol, setRol] = useState(usuario.rol)

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={usuario.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre completo *</label>
          <input type="text" name="nombre" required defaultValue={usuario.nombre} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>DNI *</label>
          <input
            type="text"
            name="dni"
            required
            maxLength={8}
            placeholder="8 dígitos"
            defaultValue={usuario.dni ?? ''}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Rol *</label>
          <select
            name="rol"
            required
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className={CAMPO}
          >
            <option value="admin" className="text-[#1e293b] dark:text-slate-100">
              Administrador
            </option>
            <option value="almacen" className="text-[#1e293b] dark:text-slate-100">
              Almacén
            </option>
            <option value="ventas" className="text-[#1e293b] dark:text-slate-100">
              Ventas
            </option>
          </select>
        </div>

        {rol === 'almacen' && (
          <div>
            <label className={LABEL}>Brevete *</label>
            <input type="text" name="brevete" required defaultValue={usuario.brevete ?? ''} className={CAMPO} />
            <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              Obligatorio para Almacén — reparto/manejo de vehículos.
            </p>
          </div>
        )}

        {rol !== 'admin' && (
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL}>Módulos a los que tiene acceso</label>
            <p className="mt-1 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
              Por defecto un usuario no-administrador no ve ningún módulo. Marca los que puede usar.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {MODULOS.map((m) => (
                <label
                  key={m.clave}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-[#1e293b] dark:text-slate-100 transition-colors has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50"
                >
                  <input
                    type="checkbox"
                    name="modulos"
                    value={m.clave}
                    defaultChecked={modulosActivos.includes(m.clave)}
                    className="h-4 w-4 accent-rose-500"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-gradient-to-r from-rose-500 to-red-500 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95"
      >
        Guardar cambios
      </button>
    </form>
  )
}
