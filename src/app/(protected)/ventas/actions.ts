'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { IGV_TASA } from '@/lib/cotizaciones'

export type EstadoFormulario = { error: string | null }

type Linea = { producto_id: number; cantidad: number; precio_unitario: number }

export async function crearOrdenVenta(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('ventas'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

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

export async function emitirComprobante(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('ventas'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const ordenId = Number(formData.get('orden_id'))
  const tipo = formData.get('tipo') as string

  if (!['factura', 'boleta', 'nota_venta'].includes(tipo)) {
    return { error: 'Selecciona un tipo de comprobante válido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .select('id, numero, estado, total, cliente_id, clientes(documento)')
    .eq('id', ordenId)
    .single()

  if (errorOrden || !orden) {
    return { error: 'Orden no encontrada.' }
  }
  if (orden.estado !== 'pendiente') {
    return { error: 'Esta orden ya fue facturada o anulada.' }
  }

  const cliente = Array.isArray(orden.clientes) ? orden.clientes[0] : orden.clientes
  if (tipo === 'factura' && (cliente?.documento ?? '').trim().length !== 11) {
    return {
      error: 'Este cliente no tiene RUC (11 dígitos) — no se puede emitir Factura. Usa Boleta o Nota de venta.',
    }
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_venta')
    .select('producto_id, cantidad')
    .eq('orden_id', ordenId)

  if (errorDetalles || !detalles || detalles.length === 0) {
    return { error: 'La orden no tiene productos.' }
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
    return { error: errorMovs.message }
  }

  const total = Number(orden.total)
  const subtotal = Number((total / (1 + IGV_TASA)).toFixed(2))
  const igv = Number((total - subtotal).toFixed(2))

  const { data: comprobante, error: errorComp } = await supabase
    .from('comprobantes')
    .insert({
      tipo,
      orden_venta_id: ordenId,
      cliente_id: orden.cliente_id,
      usuario_id: user?.id ?? null,
      subtotal,
      igv,
      total,
    })
    .select('id')
    .single()

  if (errorComp || !comprobante) {
    return { error: errorComp?.message ?? 'No se pudo emitir el comprobante.' }
  }

  const { error: errorUpdate } = await supabase
    .from('ordenes_venta')
    .update({ estado: 'facturada', facturada_en: new Date().toISOString() })
    .eq('id', ordenId)

  if (errorUpdate) {
    return { error: errorUpdate.message }
  }

  revalidatePath('/ventas')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
  revalidatePath('/consulta-ventas')
  redirect(`/consulta-ventas/${comprobante.id}`)
}

export async function anularOrdenVenta(id: number) {
  if (!(await tienePermiso('ventas'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

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
