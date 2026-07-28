'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

type Linea = { producto_id: number; cantidad: number; precio_unitario: number }

export async function crearOrdenVenta(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const clienteId = formData.get('cliente_id') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string

  if (!clienteId) {
    return { error: 'Selecciona un cliente.' }
  }

  let lineas: Linea[]
  try {
    lineas = JSON.parse(lineasRaw || '[]')
  } catch {
    return { error: 'Las líneas de la orden no son válidas.' }
  }

  lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
  if (lineas.length === 0) {
    return { error: 'Agrega al menos un producto a la orden.' }
  }
  if (lineas.some((l) => l.precio_unitario < 0)) {
    return { error: 'El precio unitario no puede ser negativo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .insert({
      cliente_id: Number(clienteId),
      usuario_id: user?.id ?? null,
      observacion: observacion || null,
      total,
    })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    return { error: errorOrden?.message ?? 'No se pudo crear la orden.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_venta').insert(
    lineas.map((l) => ({
      orden_id: orden.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  redirect('/ventas')
}

export async function facturarOrdenVenta(id: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .select('id, numero, estado')
    .eq('id', id)
    .single()

  if (errorOrden || !orden) {
    throw new Error('Orden no encontrada.')
  }
  if (orden.estado !== 'pendiente') {
    throw new Error('Esta orden ya fue facturada o anulada.')
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_venta')
    .select('producto_id, cantidad')
    .eq('orden_id', id)

  if (errorDetalles || !detalles || detalles.length === 0) {
    throw new Error('La orden no tiene productos.')
  }

  // El trigger valida stock suficiente por cada línea (lanza excepción si falta).
  const { error: errorMovs } = await supabase.from('movimientos').insert(
    detalles.map((d) => ({
      producto_id: d.producto_id,
      tipo: 'salida',
      cantidad: d.cantidad,
      usuario_id: user?.id ?? null,
      motivo: `Venta ${orden.numero}`,
      referencia: orden.numero,
    }))
  )

  if (errorMovs) {
    throw new Error(errorMovs.message)
  }

  const { error: errorUpdate } = await supabase
    .from('ordenes_venta')
    .update({ estado: 'facturada', facturada_en: new Date().toISOString() })
    .eq('id', id)

  if (errorUpdate) {
    throw new Error(errorUpdate.message)
  }

  revalidatePath('/ventas')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
}

export async function anularOrdenVenta(id: number) {
  const supabase = await createClient()

  const { data: orden } = await supabase.from('ordenes_venta').select('estado').eq('id', id).single()

  if (!orden || orden.estado !== 'pendiente') {
    throw new Error('Solo se pueden anular órdenes pendientes.')
  }

  const { error } = await supabase.from('ordenes_venta').update({ estado: 'anulada' }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/ventas')
}
