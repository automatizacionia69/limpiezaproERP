'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

type Linea = { producto_id: number; cantidad: number; costo_unitario: number }

export async function crearOrdenCompra(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const proveedorId = formData.get('proveedor_id') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string

  if (!proveedorId) {
    return { error: 'Selecciona un proveedor.' }
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
  if (lineas.some((l) => l.costo_unitario < 0)) {
    return { error: 'El costo unitario no puede ser negativo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.costo_unitario, 0)

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_compra')
    .insert({
      proveedor_id: Number(proveedorId),
      usuario_id: user?.id ?? null,
      observacion: observacion || null,
      total,
    })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    return { error: errorOrden?.message ?? 'No se pudo crear la orden.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_compra').insert(
    lineas.map((l) => ({
      orden_id: orden.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      costo_unitario: l.costo_unitario,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  redirect('/compras')
}

export async function recibirOrdenCompra(id: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_compra')
    .select('id, numero, estado')
    .eq('id', id)
    .single()

  if (errorOrden || !orden) {
    throw new Error('Orden no encontrada.')
  }
  if (orden.estado !== 'pendiente') {
    throw new Error('Esta orden ya fue recibida o anulada.')
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_compra')
    .select('producto_id, cantidad, costo_unitario')
    .eq('orden_id', id)

  if (errorDetalles || !detalles || detalles.length === 0) {
    throw new Error('La orden no tiene productos.')
  }

  const { error: errorMovs } = await supabase.from('movimientos').insert(
    detalles.map((d) => ({
      producto_id: d.producto_id,
      tipo: 'entrada',
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario,
      usuario_id: user?.id ?? null,
      motivo: `Compra ${orden.numero}`,
      referencia: orden.numero,
    }))
  )

  if (errorMovs) {
    throw new Error(errorMovs.message)
  }

  const { error: errorUpdate } = await supabase
    .from('ordenes_compra')
    .update({ estado: 'recibida', recibida_en: new Date().toISOString() })
    .eq('id', id)

  if (errorUpdate) {
    throw new Error(errorUpdate.message)
  }

  revalidatePath('/compras')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
}

export async function anularOrdenCompra(id: number) {
  const supabase = await createClient()

  const { data: orden } = await supabase
    .from('ordenes_compra')
    .select('estado')
    .eq('id', id)
    .single()

  if (!orden || orden.estado !== 'pendiente') {
    throw new Error('Solo se pueden anular órdenes pendientes.')
  }

  const { error } = await supabase.from('ordenes_compra').update({ estado: 'anulada' }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/compras')
}
