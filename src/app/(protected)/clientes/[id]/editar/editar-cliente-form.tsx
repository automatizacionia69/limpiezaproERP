'use client'

import { useActionState, useState, useTransition } from 'react'
import { editarCliente, type EstadoFormulario } from '../../actions'
import { buscarRazonSocialPorRuc, buscarNombrePorDni } from '@/lib/decolecta'
import { Buscador } from '@/components/buscador'

type Cliente = {
  id: number
  nombre: string
  documento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  vendedor_id: string | null
}
type Vendedor = { id: string; nombre: string }

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100'
const LABEL = 'block text-sm font-bold text-[#1e293b] dark:text-slate-100'

export function EditarClienteForm({ cliente, vendedores }: { cliente: Cliente; vendedores: Vendedor[] }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarCliente, {
    error: null,
  })
  const [documento, setDocumento] = useState(cliente.documento ?? '')
  const [nombre, setNombre] = useState(cliente.nombre)
  const [direccion, setDireccion] = useState(cliente.direccion ?? '')
  const [vendedorId, setVendedorId] = useState(cliente.vendedor_id ?? '')
  const [errorRuc, setErrorRuc] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()

  function buscarDocumento() {
    setErrorRuc(null)
    startBusqueda(async () => {
      if (documento.length === 8) {
        const resultado = await buscarNombrePorDni(documento)
        if ('error' in resultado) {
          setErrorRuc(resultado.error)
        } else {
          setNombre(resultado.nombre)
        }
      } else {
        const resultado = await buscarRazonSocialPorRuc(documento)
        if ('error' in resultado) {
          setErrorRuc(resultado.error)
        } else {
          setNombre(resultado.nombre)
          if (resultado.direccion) setDireccion(resultado.direccion)
        }
      }
    })
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={cliente.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Documento (RUC/DNI)</label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              name="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              maxLength={11}
              placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
              className="flex-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-4 py-3 text-base text-[#1e293b] dark:text-slate-100 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={buscarDocumento}
              disabled={buscando || (documento.length !== 8 && documento.length !== 11)}
              className="shrink-0 rounded-xl bg-orange-50 px-5 py-3 text-sm font-bold text-orange-600 transition-all hover:bg-orange-100 disabled:opacity-40"
            >
              {buscando ? 'Buscando…' : '🔍 Buscar'}
            </button>
          </div>
          {errorRuc && <p className="mt-1.5 text-xs font-medium text-red-600">{errorRuc}</p>}
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
            Con DNI trae el nombre; con RUC trae razón social y dirección.
          </p>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Nombre / Razón social *</label>
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
          <label className={LABEL}>Teléfono</label>
          <input type="text" name="telefono" defaultValue={cliente.telefono ?? ''} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Correo</label>
          <input type="email" name="email" defaultValue={cliente.email ?? ''} className={CAMPO} />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={LABEL}>Dirección</label>
          <input
            type="text"
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>Vendedor asignado</label>
          <div className="mt-1.5">
            <Buscador
              opciones={vendedores}
              valor={vendedorId}
              onChange={(id) => setVendedorId(String(id) || '')}
              placeholder="Escribe el nombre del vendedor..."
            />
          </div>
          <input type="hidden" name="vendedor_id" value={vendedorId} />
          <p className="mt-1.5 text-xs font-medium text-[#94a3b8] dark:text-slate-500">
            Este vendedor se asignará automáticamente al crear cotizaciones para este cliente.
          </p>
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40"
      >
        Guardar cambios
      </button>
    </form>
  )
}
