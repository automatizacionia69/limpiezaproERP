'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { IGV_TASA } from '@/lib/cotizaciones'

export type EstadoFormulario = { error: string | null }

type Linea = { producto_id: number; cantidad: number; precio_unitario: number }

export async function crearCotizacion(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const clienteId = formData.get('cliente_id') as string
  const fecha = formData.get('fecha') as string
  const diasCredito = formData.get('dias_credito') as string
  const medioPago = formData.get('medio_pago') as string
  const vendedorId = formData.get('vendedor_id') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string

  if (!clienteId) {
    return { error: 'Selecciona un cliente.' }
  }
  if (!fecha) {
    return { error: 'Selecciona la fecha de la cotización.' }
  }
  if (!vendedorId) {
    return { error: 'Selecciona el vendedor (pestaña Vendedor).' }
  }

  let lineas: Linea[]
  try {
    lineas = JSON.parse(lineasRaw || '[]')
  } catch {
    return { error: 'Las líneas de la cotización no son válidas.' }
  }

  lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
  if (lineas.length === 0) {
    return { error: 'Agrega al menos un producto a la cotización.' }
  }
  if (lineas.some((l) => l.precio_unitario < 0)) {
    return { error: 'El precio unitario no puede ser negativo.' }
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
  const igv = subtotal * IGV_TASA
  const total = subtotal + igv

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: cotizacion, error: errorCotizacion } = await supabase
    .from('cotizaciones')
    .insert({
      cliente_id: Number(clienteId),
      fecha,
      dias_credito: diasCredito || 'Contado',
      medio_pago: medioPago || 'Transferencia',
      vendedor_id: vendedorId,
      usuario_id: user?.id ?? null,
      observacion: observacion || null,
      subtotal,
      igv,
      total,
    })
    .select('id')
    .single()

  if (errorCotizacion || !cotizacion) {
    return { error: errorCotizacion?.message ?? 'No se pudo crear la cotización.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_cotizacion').insert(
    lineas.map((l) => ({
      cotizacion_id: cotizacion.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  revalidatePath('/cotizaciones')
  redirect(`/cotizaciones/${cotizacion.id}`)
}

export async function eliminarCotizacion(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('cotizaciones').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/cotizaciones')
}
