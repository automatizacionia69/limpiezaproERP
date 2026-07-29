'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null }

export async function editarGuiaRemision(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('guias_remision'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const id = formData.get('id') as string
  const numero = (formData.get('numero') as string)?.trim()
  const fecha = formData.get('fecha') as string
  const direccionDespacho = (formData.get('direccion_despacho') as string)?.trim()
  const observacion = (formData.get('observacion') as string)?.trim()

  if (!id) {
    return { error: 'Guía inválida.' }
  }
  if (!numero) {
    return { error: 'El número de la guía es obligatorio.' }
  }
  if (!fecha) {
    return { error: 'Selecciona la fecha de la guía.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('guias_remision')
    .update({
      numero,
      fecha,
      direccion_despacho: direccionDespacho || null,
      observacion: observacion || null,
    })
    .eq('id', Number(id))

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una guía con ese número.' }
    }
    return { error: error.message }
  }

  revalidatePath('/guias-remision')
  revalidatePath(`/guias-remision/${id}`)
  redirect(`/guias-remision/${id}`)
}
