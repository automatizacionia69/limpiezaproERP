'use client'

import { useActionState } from 'react'
import { actualizarConfiguracion, type EstadoFormulario } from './actions'
import { filtrarTelefono } from '@/lib/telefono'

type Configuracion = {
  empresa: string
  ruc: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  moneda: string
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:bg-[#f8fafc] disabled:opacity-70'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function ConfiguracionForm({
  configuracion,
  puedeEditar,
}: {
  configuracion: Configuracion
  puedeEditar: boolean
}) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(actualizarConfiguracion, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre de la empresa *</label>
          <input
            type="text"
            name="empresa"
            required
            disabled={!puedeEditar}
            defaultValue={configuracion.empresa}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>RUC</label>
          <input
            type="text"
            name="ruc"
            disabled={!puedeEditar}
            defaultValue={configuracion.ruc ?? ''}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Símbolo de moneda</label>
          <input
            type="text"
            name="moneda"
            disabled={!puedeEditar}
            defaultValue={configuracion.moneda}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Teléfono</label>
          <input
            type="tel"
            name="telefono"
            disabled={!puedeEditar}
            defaultValue={configuracion.telefono ?? ''}
            onInput={filtrarTelefono}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className={LABEL}>Dirección</label>
          <input
            type="text"
            name="direccion"
            disabled={!puedeEditar}
            defaultValue={configuracion.direccion ?? ''}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Correo</label>
          <input
            type="email"
            name="email"
            disabled={!puedeEditar}
            defaultValue={configuracion.email ?? ''}
            className={CAMPO}
          />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✅ Configuración guardada.
        </p>
      )}

      {puedeEditar ? (
        <button
          type="submit"
          className="w-full rounded-md bg-gradient-to-r from-slate-600 to-gray-700 py-3.5 text-base font-bold text-white shadow-lg shadow-slate-500/30 transition-all"
        >
          Guardar configuración
        </button>
      ) : (
        <p className="text-center text-xs font-medium text-[#94a3b8] dark:text-slate-500">
          Solo un administrador puede editar la configuración.
        </p>
      )}
    </form>
  )
}
