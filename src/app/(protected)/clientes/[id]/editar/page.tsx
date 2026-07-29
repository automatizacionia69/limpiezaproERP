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

  const [{ data: cliente }, { data: vendedores }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, documento, telefono, email, direccion, vendedor_id')
      .eq('id', id)
      .single(),
    supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
  ])

  if (!cliente) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🧑‍🤝‍🧑 Editar cliente</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <EditarClienteForm cliente={cliente} vendedores={vendedores ?? []} />
      </div>
    </div>
  )
}
