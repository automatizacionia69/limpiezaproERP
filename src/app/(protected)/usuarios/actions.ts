'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EstadoFormulario = { error: string | null }

const ROLES_VALIDOS = ['admin', 'almacen', 'ventas']

export async function crearUsuario(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const rol = formData.get('rol') as string
  const dni = (formData.get('dni') as string)?.trim()
  const brevete = (formData.get('brevete') as string)?.trim()

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!email) {
    return { error: 'El correo es obligatorio.' }
  }
  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return { error: 'Selecciona un rol válido.' }
  }
  if (!dni || !/^\d{8}$/.test(dni)) {
    return { error: 'El DNI debe tener 8 dígitos.' }
  }
  if (rol === 'almacen' && !brevete) {
    return { error: 'El brevete es obligatorio para el rol Almacén.' }
  }

  const admin = createAdminClient()
  if (!admin) {
    return {
      error:
        'Falta configurar SUPABASE_SERVICE_ROLE_KEY en .env.local para poder crear usuarios desde aquí.',
    }
  }

  const { data, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (errorAuth || !data.user) {
    return { error: errorAuth?.message ?? 'No se pudo crear el usuario.' }
  }

  const { error: errorPerfil } = await admin
    .from('usuarios_perfil')
    .insert({ id: data.user.id, nombre, rol, dni, brevete: brevete || null })

  if (errorPerfil) {
    return { error: errorPerfil.message }
  }

  revalidatePath('/usuarios')
  redirect('/usuarios')
}

export async function editarUsuario(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const rol = formData.get('rol') as string
  const dni = (formData.get('dni') as string)?.trim()
  const brevete = (formData.get('brevete') as string)?.trim()

  if (!id) {
    return { error: 'Usuario inválido.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return { error: 'Selecciona un rol válido.' }
  }
  if (!dni || !/^\d{8}$/.test(dni)) {
    return { error: 'El DNI debe tener 8 dígitos.' }
  }
  if (rol === 'almacen' && !brevete) {
    return { error: 'El brevete es obligatorio para el rol Almacén.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('usuarios_perfil')
    .update({ nombre, rol, dni, brevete: brevete || null })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/usuarios')
  redirect('/usuarios')
}
