'use client'

import { useActionState } from 'react'
import { crearProveedor, type EstadoFormulario } from '../actions'

export function ProveedorForm() {
  const [estado, formAction] = useActionState<EstadoFormulario, FormData>(crearProveedor, {
    error: null,
  })

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Razón social *</label>
        <input
          type="text"
          name="nombre"
          required
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">RUC</label>
        <input
          type="text"
          name="ruc"
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Contacto</label>
        <input
          type="text"
          name="contacto"
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Teléfono</label>
        <input
          type="text"
          name="telefono"
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Correo</label>
        <input
          type="email"
          name="email"
          className="mt-1 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1e293b]">Dirección</label>
        <input
          type="text"
          name="direccion"
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
        Guardar proveedor
      </button>
    </form>
  )
}
