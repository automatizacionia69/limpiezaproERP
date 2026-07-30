'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null }

export async function crearCategoria(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('productos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombre = (formData.get('nombre') as string)?.trim()

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('categorias').insert({ nombre })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una categoría con ese nombre.' }
    }
    return { error: error.message }
  }

  redirect('/categorias')
}

export async function editarCategoria(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('productos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!id) {
    return { error: 'Categoría inválida.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('categorias').update({ nombre }).eq('id', Number(id))

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una categoría con ese nombre.' }
    }
    return { error: error.message }
  }

  redirect('/categorias')
}

export async function eliminarCategoria(id: number) {
  if (!(await tienePermiso('productos'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('categorias').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/categorias')
  revalidatePath('/productos')
}
