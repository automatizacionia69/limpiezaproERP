import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ClienteForm } from './cliente-form'

export default async function NuevoClientePage() {
  await requierePermiso('clientes')
  const supabase = await createClient()
  const { data: vendedores } = await supabase.from('usuarios_perfil').select('id, nombre').order('nombre')

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🧑‍🤝‍🧑 Agregar cliente</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <ClienteForm vendedores={vendedores ?? []} />
      </div>
    </div>
  )
}
