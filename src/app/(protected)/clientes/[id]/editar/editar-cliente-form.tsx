'use client'

import { useActionState, useState, useTransition } from 'react'
import { editarCliente, type EstadoFormulario } from '../../actions'
import { buscarRazonSocialPorRuc } from '@/lib/decolecta'

type Cliente = {
  id: number
  nombre: string
  documento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

const CAMPO =
  'mt-1.5 w-full rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100'
const LABEL = 'block text-sm font-bold text-[#1e293b]'

export function EditarClienteForm({ cliente }: { cliente: Cliente }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarCliente, {
    error: null,
  })
  const [documento, setDocumento] = useState(cliente.documento ?? '')
  const [nombre, setNombre] = useState(cliente.nombre)
  const [direccion, setDireccion] = useState(cliente.direccion ?? '')
  const [errorRuc, setErrorRuc] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()

  function buscarRuc() {
    setErrorRuc(null)
    startBusqueda(async () => {
      const resultado = await buscarRazonSocialPorRuc(documento)
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
      <input type="hidden" name="id" value={cliente.id} />

      <div>
        <label className={LABEL}>Documento (RUC/DNI)</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            name="documento"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            maxLength={11}
            placeholder="RUC de 11 dígitos"
            className="flex-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-base text-[#1e293b] outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
          <button
            type="button"
            onClick={buscarRuc}
            disabled={buscando || documento.length !== 11}
            className="shrink-0 rounded-xl bg-orange-50 px-5 py-3 text-sm font-bold text-orange-600 transition-all hover:bg-orange-100 disabled:opacity-40"
          >
            {buscando ? 'Buscando…' : '🔍 Buscar'}
          </button>
        </div>
        {errorRuc && <p className="mt-1.5 text-xs font-medium text-red-600">{errorRuc}</p>}
        <p className="mt-1.5 text-xs font-medium text-[#94a3b8]">
          El buscador solo funciona con RUC (11 dígitos) — si es un DNI, llena los datos a mano.
        </p>
      </div>

      <div>
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
      <div>
        <label className={LABEL}>Dirección</label>
        <input
          type="text"
          name="direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className={CAMPO}
        />
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
