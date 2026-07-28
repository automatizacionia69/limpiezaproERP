import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { EditarClienteForm } from './editar-cliente-form'

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('clientes')
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, documento, telefono, email, direccion')
    .eq('id', id)
    .single()

  if (!cliente) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">🧑‍🤝‍🧑 Editar cliente</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <EditarClienteForm cliente={cliente} />
      </div>
    </div>
  )
}
