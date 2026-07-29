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
  const clienteId = formData.get('cliente_id') as string
  const fecha = formData.get('fecha') as string
  const diasCredito = (formData.get('dias_credito') as string) || 'Contado'
  const medioPago = (formData.get('medio_pago') as string) || 'Efectivo'
  const vendedorId = formData.get('vendedor_id') as string
  const lineasRaw = formData.get('lineas') as string

  if (!['factura', 'boleta', 'nota_venta', 'ticket'].includes(tipo)) {
    return { error: 'Selecciona un tipo de comprobante válido.' }
  }
  if (!clienteId) {
    return { error: 'Selecciona un cliente.' }
  }
  if (!fecha) {
    return { error: 'Selecciona la fecha del comprobante.' }
  }
  if (!vendedorId) {
    return { error: 'Selecciona el vendedor (pestaña Vendedor).' }
  }

  let lineas: Linea[]
  try {
    lineas = JSON.parse(lineasRaw || '[]')
  } catch {
    return { error: 'Las líneas de la venta no son válidas.' }
  }

  lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
  if (lineas.length === 0) {
    return { error: 'Agrega al menos un producto.' }
  }
  if (lineas.some((l) => l.precio_unitario < 0)) {
    return { error: 'El precio unitario no puede ser negativo.' }
  }
  if (lineas.some((l) => !Number.isInteger(l.cantidad))) {
    return { error: 'La cantidad de cada producto debe ser un número entero.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .select('id, numero, estado')
    .eq('id', ordenId)
    .single()

  if (errorOrden || !orden) {
    return { error: 'Orden no encontrada.' }
  }
  if (orden.estado !== 'pendiente') {
    return { error: 'Esta orden ya fue facturada o anulada.' }
  }

  const { data: cliente } = await supabase.from('clientes').select('documento, direccion').eq('id', clienteId).single()
  if (tipo === 'factura' && (cliente?.documento ?? '').trim().length !== 11) {
    return {
      error: 'Este cliente no tiene RUC (11 dígitos) — no se puede emitir Factura. Usa Boleta, Nota de venta o Ticket.',
    }
  }

  // Las líneas pudieron editarse en esta pantalla: reemplaza el detalle de la orden.
  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)

  const { error: errorDeleteDetalle } = await supabase.from('detalle_venta').delete().eq('orden_id', ordenId)
  if (errorDeleteDetalle) {
    return { error: errorDeleteDetalle.message }
  }

  const { error: errorDetalle } = await supabase.from('detalle_venta').insert(
    lineas.map((l) => ({
      orden_id: ordenId,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    }))
  )
  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  const { error: errorUpdateOrden } = await supabase
    .from('ordenes_venta')
    .update({ cliente_id: Number(clienteId), total })
    .eq('id', ordenId)
  if (errorUpdateOrden) {
    return { error: errorUpdateOrden.message }
  }

  // El trigger valida stock suficiente por cada línea (lanza excepción si falta).
  const { error: errorMovs } = await supabase.from('movimientos').insert(
    lineas.map((l) => ({
      producto_id: l.producto_id,
      tipo: 'salida',
      cantidad: l.cantidad,
      usuario_id: user?.id ?? null,
      motivo: `Venta ${orden.numero}`,
      referencia: orden.numero,
    }))
  )

  if (errorMovs) {
    return { error: errorMovs.message }
  }

  const subtotal = Number((total / (1 + IGV_TASA)).toFixed(2))
  const igv = Number((total - subtotal).toFixed(2))

  const { data: comprobante, error: errorComp } = await supabase
    .from('comprobantes')
    .insert({
      tipo,
      orden_venta_id: ordenId,
      cliente_id: Number(clienteId),
      usuario_id: user?.id ?? null,
      vendedor_id: vendedorId,
      fecha_emision: fecha,
      dias_credito: diasCredito,
      medio_pago: medioPago,
      subtotal,
      igv,
      total,
    })
    .select('id')
    .single()

  if (errorComp || !comprobante) {
    return { error: errorComp?.message ?? 'No se pudo emitir el comprobante.' }
  }

  const { error: errorGuia } = await supabase.from('guias_remision').insert({
    comprobante_id: comprobante.id,
    fecha,
    direccion_despacho: cliente?.direccion || null,
    usuario_id: user?.id ?? null,
  })

  if (errorGuia) {
    return { error: errorGuia.message }
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
  revalidatePath('/guias-remision')
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
