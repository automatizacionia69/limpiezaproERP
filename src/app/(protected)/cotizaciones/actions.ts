'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { calcularImportes, calcularDescuento, aplicarDescuento, type DescuentoTipo } from '@/lib/cotizaciones'
import { fechaDocumentoFueraDeRango } from '@/lib/fecha'

export type EstadoFormulario = {
  error: string | null
  exito?: { id: number; numero: string; total: number; moneda: 'PEN' | 'USD' } | null
}

type Linea = {
  producto_id: number
  cantidad: number
  precio_unitario: number
  caracteristicas?: string | null
  fecha_entrega?: string | null
  unidad_nombre?: string | null
}

export async function crearCotizacion(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('cotizaciones'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const clienteId = formData.get('cliente_id') as string
  const fecha = formData.get('fecha') as string
  const diasCredito = formData.get('dias_credito') as string
  const medioPago = formData.get('medio_pago') as string
  const vendedorId = formData.get('vendedor_id') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string
  const moneda = (formData.get('moneda') as string) || 'PEN'
  const fechaEntrega = (formData.get('fecha_entrega') as string) || null
  const documentoReferencia = (formData.get('documento_referencia') as string)?.trim() || null
  const vigenciaDiasRaw = formData.get('vigencia_dias') as string
  const vigenciaDias = vigenciaDiasRaw ? Number(vigenciaDiasRaw) : null
  const descuentoTipoRaw = formData.get('descuento_tipo') as string
  const descuentoTipo: DescuentoTipo | null =
    descuentoTipoRaw === 'porcentaje' || descuentoTipoRaw === 'monto' ? descuentoTipoRaw : null
  const descuentoValor = Number(formData.get('descuento_valor')) || 0

  if (!clienteId) {
    return { error: 'Selecciona un cliente.' }
  }
  if (!fecha) {
    return { error: 'Selecciona la fecha de la cotización.' }
  }
  if (fechaDocumentoFueraDeRango(fecha)) {
    return { error: 'La fecha de la cotización no puede ser futura ni atrasarse más de 3 días.' }
  }
  if (!vendedorId) {
    return { error: 'Selecciona el vendedor.' }
  }
  if (moneda !== 'PEN' && moneda !== 'USD') {
    return { error: 'Moneda inválida.' }
  }
  if (vigenciaDias !== null && vigenciaDias <= 0) {
    return { error: 'La vigencia de la oferta debe ser mayor a 0 días.' }
  }
  if (descuentoValor < 0) {
    return { error: 'El descuento no puede ser negativo.' }
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

  const importesBrutos = calcularImportes(lineas)
  const descuento = calcularDescuento(importesBrutos.total, descuentoTipo, descuentoValor)
  const { subtotal, igv, total } = aplicarDescuento(importesBrutos, descuento)

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
      moneda,
      fecha_entrega: fechaEntrega,
      documento_referencia: documentoReferencia,
      vigencia_dias: vigenciaDias,
      descuento_tipo: descuentoTipo,
      descuento_valor: descuentoValor,
      descuento_monto: descuento,
      subtotal,
      igv,
      total,
    })
    .select('id, numero')
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
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  revalidatePath('/cotizaciones')
  return {
    error: null,
    exito: { id: cotizacion.id, numero: cotizacion.numero, total, moneda: moneda as 'PEN' | 'USD' },
  }
}

export async function eliminarCotizacion(id: number) {
  if (!(await tienePermiso('cotizaciones'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('cotizaciones').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/cotizaciones')
}

export async function convertirCotizacionAVenta(cotizacionId: number) {
  if (!(await tienePermiso('cotizaciones')) || !(await tienePermiso('ventas'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se RESERVA la cotizacion antes de crear nada: el update condicionado a
  // estado='pendiente' lo resuelve la base de forma atomica, asi que dos clicks
  // (o dos vendedores mirando la misma cotizacion) no pueden generar dos
  // ordenes de venta duplicadas, ambas facturables y despachables.
  const { data: cotizacion, error: errorCotizacion } = await supabase
    .from('cotizaciones')
    .update({ estado: 'convertida' })
    .eq('id', cotizacionId)
    .eq('estado', 'pendiente')
    .select('id, numero, cliente_id, total, dias_credito')
    .maybeSingle()

  if (errorCotizacion) {
    throw new Error(errorCotizacion.message)
  }
  if (!cotizacion) {
    // O no existe, o alguien la convirtio primero.
    const { data: existente } = await supabase
      .from('cotizaciones')
      .select('numero, orden_venta_id')
      .eq('id', cotizacionId)
      .maybeSingle()

    throw new Error(
      existente
        ? `La cotización ${existente.numero} ya fue convertida a venta.`
        : 'Cotización no encontrada.'
    )
  }

  // Si algo falla despues de la reserva hay que devolver la cotizacion a
  // 'pendiente', o quedaria bloqueada para siempre sin haber generado la orden.
  const liberarReserva = async () => {
    await supabase
      .from('cotizaciones')
      .update({ estado: 'pendiente', orden_venta_id: null })
      .eq('id', cotizacionId)
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_cotizacion')
    .select('producto_id, cantidad, precio_unitario')
    .eq('cotizacion_id', cotizacionId)

  if (errorDetalles || !detalles || detalles.length === 0) {
    await liberarReserva()
    throw new Error('La cotización no tiene productos.')
  }

  // Se copia el total ya calculado de la cotizacion en vez de recalcularlo:
  // asi la orden vale exactamente lo que el cliente aprobo por escrito. Antes
  // se recalculaba sin IGV y la venta quedaba 18% por debajo de la cotizacion.
  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .insert({
      cliente_id: cotizacion.cliente_id,
      usuario_id: user?.id ?? null,
      observacion: `Generada desde cotización ${cotizacion.numero}`,
      total: cotizacion.total,
      dias_credito: cotizacion.dias_credito,
    })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    await liberarReserva()
    throw new Error(errorOrden?.message ?? 'No se pudo crear la orden de venta.')
  }

  const { error: errorDetalleVenta } = await supabase.from('detalle_venta').insert(
    detalles.map((d) => ({
      orden_id: orden.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
    }))
  )

  if (errorDetalleVenta) {
    // La cabecera queda huerfana (sin lineas) pero sin poder facturarse por
    // error: se libera la cotizacion y se loggea para revision manual.
    console.error(
      `Orden ${orden.id} creada sin detalle desde ${cotizacion.numero}: ${errorDetalleVenta.message}`
    )
    await liberarReserva()
    throw new Error(errorDetalleVenta.message)
  }

  // Queda el enlace para que la cotizacion sepa que orden genero.
  await supabase
    .from('cotizaciones')
    .update({ orden_venta_id: orden.id })
    .eq('id', cotizacionId)

  revalidatePath('/ventas')
  revalidatePath('/cotizaciones')
  redirect('/ventas')
}
