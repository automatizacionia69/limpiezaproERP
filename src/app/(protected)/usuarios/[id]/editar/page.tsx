import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requiereAdmin } from '@/lib/permisos'
import { EditarUsuarioForm } from './editar-usuario-form'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requiereAdmin()
  const { id } = await params
  const supabase = await createClient()
  const [{ data: usuario }, { data: permisos }] = await Promise.all([
    supabase.from('usuarios_perfil').select('id, nombre, rol, dni, brevete').eq('id', id).single(),
    supabase.from('usuarios_permisos').select('modulo').eq('usuario_id', id).eq('activo', true),
  ])

  if (!usuario) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">👥 Editar usuario</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <EditarUsuarioForm usuario={usuario} modulosActivos={(permisos ?? []).map((p) => p.modulo)} />
      </div>
    </div>
  )
}
