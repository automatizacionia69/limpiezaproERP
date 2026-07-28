import { createClient } from '@/lib/supabase/server'
import { UsuariosTabla } from './usuarios-tabla'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: usuarios } = await supabase
    .from('usuarios_perfil')
    .select('id, nombre, rol, dni, brevete')
    .order('nombre')

  return <UsuariosTabla usuarios={usuarios ?? []} />
}
