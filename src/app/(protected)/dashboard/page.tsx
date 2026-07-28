import { createClient } from '@/lib/supabase/server'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = user
    ? await supabase
        .from('usuarios_perfil')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()
    : { data: null }

  return (
    <div className="text-center">
      <p className="text-sm text-slate-500">Hola,</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{perfil?.nombre}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Rol: {perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : ''}
      </p>
    </div>
  )
}
