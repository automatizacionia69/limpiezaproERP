'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null }

export async function crearProveedor(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('proveedores'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombre = (formData.get('nombre') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const contacto = (formData.get('contacto') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!nombre) {
    return { error: 'La razón social es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('proveedores').insert({
    nombre,
    ruc: ruc || null,
    contacto: contacto || null,
    telefono: telefono || null,
    email: email || null,
    direccion: direccion || null,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/proveedores')
}

export async function editarProveedor(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('proveedores'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const contacto = (formData.get('contacto') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!id) {
    return { error: 'Proveedor inválido.' }
  }
  if (!nombre) {
    return { error: 'La razón social es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('proveedores')
    .update({
      nombre,
      ruc: ruc || null,
      contacto: contacto || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
    })
    .eq('id', Number(id))

  if (error) {
    return { error: error.message }
  }

  redirect('/proveedores')
}

export async function eliminarProveedor(id: number) {
  if (!(await tienePermiso('proveedores'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()

  const { error } = await supabase.from('proveedores').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'No se puede eliminar: este proveedor ya tiene órdenes de compra registradas.'
      )
    }
    throw new Error(error.message)
  }

  revalidatePath('/proveedores')
}

