import { createClient } from '@/lib/supabase/server'
import { requiereAdmin } from '@/lib/permisos'
import { UsuariosTabla } from './usuarios-tabla'

export default async function UsuariosPage() {
  await requiereAdmin()
  const supabase = await createClient()
  const { data: usuarios } = await supabase
    .from('usuarios_perfil')
    .select('id, nombre, rol, dni, brevete')
    .order('nombre')

  return <UsuariosTabla usuarios={usuarios ?? []} />
}
