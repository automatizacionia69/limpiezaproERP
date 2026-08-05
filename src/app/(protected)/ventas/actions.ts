'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { calcularImportes } from '@/lib/cotizaciones'
import { enviarComprobanteANubefact } from '@/lib/nubefact-envio'
import { fechaDocumentoFueraDeRango } from '@/lib/fecha'

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

  // ordenes_venta.total incluye IGV, igual que cotizaciones.total y
  // comprobantes.total: una sola convencion en todo el flujo.
  const { total } = calcularImportes(lineas)

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
  if (fechaDocumentoFueraDeRango(fecha)) {
    return { error: 'La fecha del comprobante no puede ser futura ni atrasarse más de 3 días.' }
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

  // Se RESERVA la orden ANTES de tocar stock o emitir el comprobante. El update
  // condicionado a estado='pendiente' es atomico en la base, asi que dos clicks
  // en "Grabar venta" (el boton no se deshabilita) o dos vendedores con la
  // pantalla abierta ya no pueden descontar el stock dos veces ni emitir dos
  // correlativos. Antes el estado se validaba al principio y se escribia ~90
  // lineas despues, con seis escrituras en el medio.
  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_venta')
    .update({ estado: 'facturada' })
    .eq('id', ordenId)
    .eq('estado', 'pendiente')
    .select('id, numero, estado')
    .maybeSingle()

  if (errorOrden) {
    return { error: errorOrden.message }
  }
  if (!orden) {
    return { error: 'Esta orden ya fue facturada o anulada.' }
  }

  // Cualquier fallo posterior tiene que devolver la orden a 'pendiente', o
  // quedaria marcada como facturada sin comprobante y sin poder reintentarse.
  const liberarReserva = async () => {
    await supabase.from('ordenes_venta').update({ estado: 'pendiente' }).eq('id', ordenId)
  }

  const { data: cliente } = await supabase
    .from('clientes')
    .select('documento, direccion')
    .eq('id', clienteId)
    .single()
  if (tipo === 'factura' && (cliente?.documento ?? '').trim().length !== 11) {
    await liberarReserva()
    return {
      error: 'Este cliente no tiene RUC (11 dígitos) — no se puede emitir Factura. Usa Boleta, Nota de venta o Ticket.',
    }
  }

  // El vendedor se valida ANTES de tocar nada: llegaba crudo del formulario y
  // solo se chequeaba que no estuviera vacio, asi que un valor invalido hacia
  // reventar el insert del comprobante DESPUES de haber descontado el stock.
  const { data: vendedor } = await supabase
    .from('usuarios_perfil')
    .select('id')
    .eq('id', vendedorId)
    .maybeSingle()

  if (!vendedor) {
    await liberarReserva()
    return { error: 'El vendedor seleccionado no es válido.' }
  }

  // Las líneas pudieron editarse en esta pantalla: reemplaza el detalle de la orden.
  const { subtotal, igv, total } = calcularImportes(lineas)

  const { error: errorDeleteDetalle } = await supabase.from('detalle_venta').delete().eq('orden_id', ordenId)
  if (errorDeleteDetalle) {
    await liberarReserva()
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
    await liberarReserva()
    return { error: errorDetalle.message }
  }

  const { error: errorUpdateOrden } = await supabase
    .from('ordenes_venta')
    .update({ cliente_id: Number(clienteId), total })
    .eq('id', ordenId)
  if (errorUpdateOrden) {
    await liberarReserva()
    return { error: errorUpdateOrden.message }
  }

  // El comprobante se emite ANTES de descontar stock: si falla (RLS, dato
  // invalido, timeout) todavia no se movio inventario, asi que liberando la
  // reserva el reintento arranca de cero sin haber descontado nada.
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
    await liberarReserva()
    return { error: errorComp?.message ?? 'No se pudo emitir el comprobante.' }
  }

  // Recien ahora se descuenta el stock. Ojo: la validacion de stock suficiente
  // se quito en add-permitir-stock-negativo.sql, asi que el trigger ya NO frena
  // por falta de stock (es una decision de negocio: no detener la venta).
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
    // Se deshace el comprobante para no dejar una venta facturada sin salida de
    // almacen. Se quema el correlativo, pero el estado queda consistente.
    await supabase.from('comprobantes').delete().eq('id', comprobante.id)
    await liberarReserva()
    console.error(
      `Comprobante ${comprobante.id} revertido: fallaron los movimientos de ${orden.numero}: ${errorMovs.message}`
    )
    return { error: errorMovs.message }
  }

  // La guia es accesoria: si falla, la venta ya es valida y no tiene sentido
  // revertir el comprobante ni pedirle al vendedor que reintente todo (antes
  // ese error dejaba la orden en 'pendiente' y el reintento duplicaba el
  // comprobante y el stock). Se loggea para generarla a mano.
  const { error: errorGuia } = await supabase.from('guias_remision').insert({
    comprobante_id: comprobante.id,
    fecha,
    direccion_despacho: cliente?.direccion || null,
    usuario_id: user?.id ?? null,
  })

  if (errorGuia) {
    console.error(
      `Venta ${orden.numero} facturada OK pero sin guia de remision (comprobante ${comprobante.id}): ${errorGuia.message}`
    )
  }

  // Envio a NUBEFACT (SUNAT real) — solo Factura y Boleta son documentos
  // electronicos validos ante SUNAT, Nota de venta y Ticket son documentos
  // internos y no se envian. Corre AL FINAL, cuando la venta local ya quedo
  // grabada por completo: si NUBEFACT falla o no responde, la venta NO se
  // revierte (decision de negocio — no bloquear una venta real por un
  // problema externo de SUNAT/NUBEFACT); el comprobante queda con
  // nubefact_estado='error' y el mensaje en nubefact_error, para reenviarlo
  // despues desde Consulta de Ventas (mismo helper que usa ese boton).
  if (tipo === 'factura' || tipo === 'boleta') {
    const resultadoNubefact = await enviarComprobanteANubefact(supabase, comprobante.id)
    if (!resultadoNubefact.ok) {
      console.error(
        `Comprobante ${comprobante.id} (${orden.numero}) no se pudo enviar a NUBEFACT: ${resultadoNubefact.error}`
      )
    }
  } else {
    await supabase.from('comprobantes').update({ nubefact_estado: 'no_aplica' }).eq('id', comprobante.id)
  }

  // La orden ya quedo en 'facturada' en la reserva del principio; solo falta la
  // marca de tiempo.
  await supabase
    .from('ordenes_venta')
    .update({ facturada_en: new Date().toISOString() })
    .eq('id', ordenId)

  revalidatePath('/ventas')
  revalidatePath('/cotizaciones')
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
