'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

export async function crearCliente(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const documento = (formData.get('documento') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('clientes').insert({
    nombre,
    documento: documento || null,
    telefono: telefono || null,
    email: email || null,
    direccion: direccion || null,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/clientes')
}

export async function editarCliente(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const documento = (formData.get('documento') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!id) {
    return { error: 'Cliente inválido.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre,
      documento: documento || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
    })
    .eq('id', Number(id))

  if (error) {
    return { error: error.message }
  }

  redirect('/clientes')
}

export async function eliminarCliente(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: este cliente ya tiene órdenes de venta registradas.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/clientes')
}
