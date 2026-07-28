'use client'

import { useActionState } from 'react'
import { editarCliente, type EstadoFormulario } from '../../actions'

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

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={cliente.id} />
      <div>
        <label className={LABEL}>Nombre / Razón social *</label>
        <input type="text" name="nombre" required defaultValue={cliente.nombre} className={CAMPO} />
      </div>
      <div>
        <label className={LABEL}>Documento (DNI/RUC)</label>
        <input type="text" name="documento" defaultValue={cliente.documento ?? ''} className={CAMPO} />
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
        <input type="text" name="direccion" defaultValue={cliente.direccion ?? ''} className={CAMPO} />
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
