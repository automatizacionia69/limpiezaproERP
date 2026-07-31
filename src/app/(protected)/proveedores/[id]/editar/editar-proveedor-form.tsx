'use client'

import { useActionState, useState, useTransition } from 'react'
import { editarProveedor, type EstadoFormulario } from '../../actions'
import { buscarRazonSocialPorRuc } from '@/lib/decolecta'
import { filtrarTelefono } from '@/lib/telefono'

type Proveedor = {
  id: number
  nombre: string
  ruc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function EditarProveedorForm({ proveedor }: { proveedor: Proveedor }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarProveedor, {
    error: null,
  })
  const [ruc, setRuc] = useState(proveedor.ruc ?? '')
  const [nombre, setNombre] = useState(proveedor.nombre)
  const [direccion, setDireccion] = useState(proveedor.direccion ?? '')
  const [errorRuc, setErrorRuc] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()

  function buscarRuc() {
    setErrorRuc(null)
    startBusqueda(async () => {
      const resultado = await buscarRazonSocialPorRuc(ruc)
      if ('error' in resultado) {
        setErrorRuc(resultado.error)
      } else {
        setNombre(resultado.nombre)
        if (resultado.direccion) setDireccion(resultado.direccion)
      }
    })
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={proveedor.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>RUC</label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              name="ruc"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              maxLength={11}
              placeholder="11 dígitos"
              className="flex-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
            <button
              type="button"
              onClick={buscarRuc}
              disabled={buscando || ruc.length !== 11}
              className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/40 disabled:opacity-40 disabled:shadow-none"
            >
              {buscando ? 'Buscando…' : '🔍 Buscar'}
            </button>
          </div>
          {errorRuc && <p className="mt-1.5 text-xs font-medium text-red-600">{errorRuc}</p>}
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Razón social *</label>
          <input
            type="text"
            name="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={LABEL}>Contacto</label>
          <input type="text" name="contacto" defaultValue={proveedor.contacto ?? ''} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Teléfono</label>
          <input type="tel" name="telefono" defaultValue={proveedor.telefono ?? ''} onInput={filtrarTelefono} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Correo</label>
          <input type="email" name="email" defaultValue={proveedor.email ?? ''} className={CAMPO} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Dirección</label>
          <input
            type="text"
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className={CAMPO}
          />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3.5 text-base font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/40"
      >
        Guardar cambios
      </button>
    </form>
  )
}
