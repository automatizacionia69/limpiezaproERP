'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

export async function crearUnidad(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('unidades_medida').insert({ nombre })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una unidad con ese nombre.' }
    }
    return { error: error.message }
  }

  redirect('/unidades')
}

export async function editarUnidad(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!id) {
    return { error: 'Unidad inválida.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('unidades_medida').update({ nombre }).eq('id', Number(id))

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una unidad con ese nombre.' }
    }
    return { error: error.message }
  }

  redirect('/unidades')
}

export async function eliminarUnidad(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('unidades_medida').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: hay productos usando esta unidad.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/unidades')
}
