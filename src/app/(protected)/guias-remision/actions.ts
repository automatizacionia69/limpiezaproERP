'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null }

type LineaGuia = { producto_id: number; cantidad: number }

export async function crearGuiaTraslado(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('guias_remision'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const destino = (formData.get('destino') as string)?.trim()
  const motivo = (formData.get('motivo') as string)?.trim()
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string | null

  if (!destino) {
    return { error: 'Ingresa la dirección de destino.' }
  }
  if (!motivo) {
    return { error: 'Selecciona un motivo de traslado.' }
  }

  let lineas: LineaGuia[] = []
  try {
    lineas = JSON.parse(lineasRaw || '[]')
  } catch {
    return { error: 'Los productos ingresados no son válidos.' }
  }
  lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
  if (lineas.length === 0) {
    return { error: 'Agrega al menos un producto con cantidad.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: guia, error: errorGuia } = await supabase
    .from('guias_remision')
    .insert({
      comprobante_id: null,
      motivo,
      direccion_despacho: destino,
      observacion: observacion || null,
      usuario_id: user?.id ?? null,
    })
    .select('id')
    .single()

  if (errorGuia || !guia) {
    return { error: errorGuia?.message ?? 'No se pudo crear la guía.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_guia_remision').insert(
    lineas.map((l) => ({
      guia_id: guia.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  revalidatePath('/guias-remision')
  redirect(`/guias-remision/${guia.id}`)
}

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
