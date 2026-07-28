import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MODULOS, type ModuloClave } from '@/lib/modulos'

export { MODULOS, type ModuloClave }

export async function obtenerModulosPermitidos(userId: string, rol: string): Promise<Set<string>> {
  if (rol === 'admin') {
    return new Set(MODULOS.map((m) => m.clave))
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('usuarios_permisos')
    .select('modulo')
    .eq('usuario_id', userId)
    .eq('activo', true)

  return new Set((data ?? []).map((r) => r.modulo as string))
}

export async function tienePermiso(modulo: ModuloClave): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: perfil } = await supabase.from('usuarios_perfil').select('rol').eq('id', user.id).single()
  if (!perfil) return false
  if (perfil.rol === 'admin') return true

  const permitidos = await obtenerModulosPermitidos(user.id, perfil.rol)
  return permitidos.has(modulo)
}

export async function requierePermiso(modulo: ModuloClave) {
  if (!(await tienePermiso(modulo))) {
    redirect('/dashboard?sin-permiso=' + modulo)
  }
}
