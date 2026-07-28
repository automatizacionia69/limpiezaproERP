'use client'

import { useActionState, useState, useTransition } from 'react'
import { editarProveedor, buscarRazonSocialPorRuc, type EstadoFormulario } from '../../actions'

type Proveedor = {
  id: number
  nombre: string
  ruc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

export function EditarProveedorForm({ proveedor }: { proveedor: Proveedor }) {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(editarProveedor, {
    error: null,
  })
  const [ruc, setRuc] = useState(proveedor.ruc ?? '')
  const [nombre, setNombre] = useState(proveedor.nombre)
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
      }
    })
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="id" value={proveedor.id} />

      <div>
        <label className="block text-sm font-medium text-[#1e293b]">RUC</label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            name="ruc"
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            maxLength={11}
            placeholder="11 dígitos"
            className="flex-1 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
          />
          <button
            type="button"
            onClick={buscarRuc}
            disabled={buscando || ruc.length !== 11}
            className="shrink-0 rounded-lg bg-[#eef2ff] px-3 py-2 text-sm font-medium text-[#4f46e5] hover:bg-[#e0e7ff] disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {errorRuc && <p className="mt-1 text-xs text-red-600">{errorRuc}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Razón social *</label>
        <input
          type="text"
          name="nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Contacto</label>
        <input
          type="text"
          name="contacto"
          defaultValue={proveedor.contacto ?? ''}
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Teléfono</label>
        <input
          type="text"
          name="telefono"
          defaultValue={proveedor.telefono ?? ''}
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Correo</label>
        <input
          type="email"
          name="email"
          defaultValue={proveedor.email ?? ''}
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Dirección</label>
        <input
          type="text"
          name="direccion"
          defaultValue={proveedor.direccion ?? ''}
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-[#4f46e5] py-2.5 text-sm font-semibold text-white hover:bg-[#4338ca]"
      >
        Guardar cambios
      </button>
    </form>
  )
}
