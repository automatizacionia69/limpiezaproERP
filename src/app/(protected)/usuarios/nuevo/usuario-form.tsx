'use client'

import { useActionState, useState } from 'react'
import { crearUsuario, type EstadoFormulario } from '../actions'
import { MODULOS } from '@/lib/modulos'

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function UsuarioForm() {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearUsuario, {
    error: null,
  })
  const [rol, setRol] = useState('almacen')

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre completo *</label>
          <input type="text" name="nombre" required autoFocus className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>DNI *</label>
          <input type="text" name="dni" required maxLength={8} placeholder="8 dígitos" className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Correo *</label>
          <input type="email" name="email" required className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Contraseña *</label>
          <input type="password" name="password" required minLength={6} className={CAMPO} />
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">Mínimo 6 caracteres.</p>
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
            <input type="text" name="brevete" required className={CAMPO} />
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
                  <input type="checkbox" name="modulos" value={m.clave} className="h-4 w-4 accent-rose-500" />
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
        className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-red-500 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/40"
      >
        Crear usuario
      </button>
    </form>
  )
}
