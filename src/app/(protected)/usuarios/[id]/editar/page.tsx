import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarUsuarioForm } from './editar-usuario-form'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">👥 Editar usuario</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <EditarUsuarioForm usuario={usuario} modulosActivos={(permisos ?? []).map((p) => p.modulo)} />
      </div>
    </div>
  )
}
