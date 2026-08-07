'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { lookup } from 'node:dns/promises'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { calcularImportes, calcularDescuento, aplicarDescuento, type DescuentoTipo } from '@/lib/cotizaciones'
import { fechaDocumentoFueraDeRango, hoyPeruISO } from '@/lib/fecha'
import { obtenerDatosDocumentoCotizacion, type DatosDocumentoCotizacion } from '@/lib/cotizacion-documento-datos'
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

export type EstadoFormulario = {
  error: string | null
  exito?: { id: number; numero: string; total: number; moneda: 'PEN' | 'USD' } | null
}

// Para el modal de vista rápida en Consulta de Cotizaciones (ver sin salir
// de la lista, en vez de navegar a /cotizaciones/[id]).
export async function obtenerVistaCotizacion(id: number): Promise<DatosDocumentoCotizacion> {
  if (!(await tienePermiso('cotizaciones'))) {
    throw new Error('No tienes permiso para esta acción.')
  }
  const datos = await obtenerDatosDocumentoCotizacion(id)
  if (!datos) {
    throw new Error('Cotización no encontrada.')
  }
  return datos
}

type Linea = {
  producto_id: number
  cantidad: number
  precio_unitario: number
  caracteristicas?: string | null
  fecha_entrega?: string | null
  unidad_nombre?: string | null
  tipo_afectacion_igv: string
}

type DatosCotizacion = {
  clienteId: number
  fecha: string
  diasCredito: string
  medioPago: string
  vendedorId: string
  observacion: string | null
  moneda: 'PEN' | 'USD'
  fechaEntrega: string | null
  documentoReferencia: string | null
  vigenciaDias: number | null
  descuentoTipo: DescuentoTipo | null
  descuentoValor: number
  lineas: Linea[]
  subtotal: number
  igv: number
  descuentoMonto: number
  total: number
}

// Comparte la validación entre crear y editar (son el mismo formulario) para
// no tener las mismas ~15 reglas duplicadas y arriesgar que se desincronicen.
function parsearYValidarCotizacion(formData: FormData): { error: string } | { datos: DatosCotizacion } {
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
  lineas = lineas.map((l) => ({
    ...l,
    tipo_afectacion_igv: AFECTACIONES_IGV.some((a) => a.codigo === l.tipo_afectacion_igv)
      ? l.tipo_afectacion_igv
      : AFECTACION_IGV_DEFAULT,
  }))
  if (lineas.some((l) => l.precio_unitario < 0)) {
    return { error: 'El precio unitario no puede ser negativo.' }
  }

  const importesBrutos = calcularImportes(lineas)
  const descuentoMonto = calcularDescuento(importesBrutos.total, descuentoTipo, descuentoValor)
  const { subtotal, igv, total } = aplicarDescuento(importesBrutos, descuentoMonto)

  return {
    datos: {
      clienteId: Number(clienteId),
      fecha,
      diasCredito: diasCredito || 'Contado',
      medioPago: medioPago || 'Transferencia',
      vendedorId,
      observacion: observacion || null,
      moneda: moneda as 'PEN' | 'USD',
      fechaEntrega,
      documentoReferencia,
      vigenciaDias,
      descuentoTipo,
      descuentoValor,
      lineas,
      subtotal,
      igv,
      descuentoMonto,
      total,
    },
  }
}

export async function crearCotizacion(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('cotizaciones'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const resultado = parsearYValidarCotizacion(formData)
  if ('error' in resultado) {
    return { error: resultado.error }
  }
  const d = resultado.datos

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: cotizacion, error: errorCotizacion } = await supabase
    .from('cotizaciones')
    .insert({
      cliente_id: d.clienteId,
      fecha: d.fecha,
      dias_credito: d.diasCredito,
      medio_pago: d.medioPago,
      vendedor_id: d.vendedorId,
      usuario_id: user?.id ?? null,
      observacion: d.observacion,
      moneda: d.moneda,
      fecha_entrega: d.fechaEntrega,
      documento_referencia: d.documentoReferencia,
      vigencia_dias: d.vigenciaDias,
      descuento_tipo: d.descuentoTipo,
      descuento_valor: d.descuentoValor,
      descuento_monto: d.descuentoMonto,
      subtotal: d.subtotal,
      igv: d.igv,
      total: d.total,
    })
    .select('id, numero')
    .single()

  if (errorCotizacion || !cotizacion) {
    return { error: errorCotizacion?.message ?? 'No se pudo crear la cotización.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_cotizacion').insert(
    d.lineas.map((l) => ({
      cotizacion_id: cotizacion.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
      tipo_afectacion_igv: l.tipo_afectacion_igv,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  revalidatePath('/cotizaciones')
  return {
    error: null,
    exito: { id: cotizacion.id, numero: cotizacion.numero, total: d.total, moneda: d.moneda },
  }
}

export async function actualizarCotizacion(
  cotizacionId: number,
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('cotizaciones'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const resultado = parsearYValidarCotizacion(formData)
  if ('error' in resultado) {
    return { error: resultado.error }
  }
  const d = resultado.datos

  const supabase = await createClient()

  // Solo se puede editar una cotización "pendiente" — una ya convertida a
  // venta generó una orden con sus propios datos copiados; editar la
  // cotización después dejaría el documento y la venta desincronizados.
  const { data: cotizacion, error: errorCotizacion } = await supabase
    .from('cotizaciones')
    .update({
      cliente_id: d.clienteId,
      fecha: d.fecha,
      dias_credito: d.diasCredito,
      medio_pago: d.medioPago,
      vendedor_id: d.vendedorId,
      observacion: d.observacion,
      moneda: d.moneda,
      fecha_entrega: d.fechaEntrega,
      documento_referencia: d.documentoReferencia,
      vigencia_dias: d.vigenciaDias,
      descuento_tipo: d.descuentoTipo,
      descuento_valor: d.descuentoValor,
      descuento_monto: d.descuentoMonto,
      subtotal: d.subtotal,
      igv: d.igv,
      total: d.total,
    })
    .eq('id', cotizacionId)
    .eq('estado', 'pendiente')
    .select('id, numero')
    .maybeSingle()

  if (errorCotizacion) {
    return { error: errorCotizacion.message }
  }
  if (!cotizacion) {
    return { error: 'Esta cotización ya no se puede editar (no existe o ya fue convertida a venta).' }
  }

  // Se reemplazan todas las líneas en vez de calcular un diff — con el
  // volumen de líneas de una cotización (unas pocas a lo mucho un par de
  // decenas) es más simple y menos propenso a errores que reconciliar altas,
  // bajas y cambios uno por uno.
  const { error: errorBorrarDetalle } = await supabase
    .from('detalle_cotizacion')
    .delete()
    .eq('cotizacion_id', cotizacionId)

  if (errorBorrarDetalle) {
    return { error: errorBorrarDetalle.message }
  }

  const { error: errorDetalle } = await supabase.from('detalle_cotizacion').insert(
    d.lineas.map((l) => ({
      cotizacion_id: cotizacionId,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      caracteristicas: l.caracteristicas || null,
      fecha_entrega: l.fecha_entrega || null,
      unidad_nombre: l.unidad_nombre || null,
      tipo_afectacion_igv: l.tipo_afectacion_igv,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${cotizacionId}`)
  return {
    error: null,
    exito: { id: cotizacion.id, numero: cotizacion.numero, total: d.total, moneda: d.moneda },
  }
}

export async function duplicarCotizacion(cotizacionId: number) {
  if (!(await tienePermiso('cotizaciones'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: original, error: errorOriginal } = await supabase
    .from('cotizaciones')
    .select(
      'cliente_id, dias_credito, medio_pago, vendedor_id, observacion, moneda, documento_referencia, vigencia_dias, descuento_tipo, descuento_valor, descuento_monto, subtotal, igv, total'
    )
    .eq('id', cotizacionId)
    .single()

  if (errorOriginal || !original) {
    throw new Error(errorOriginal?.message ?? 'Cotización no encontrada.')
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_cotizacion')
    .select('producto_id, cantidad, precio_unitario, caracteristicas, fecha_entrega, unidad_nombre, tipo_afectacion_igv')
    .eq('cotizacion_id', cotizacionId)

  if (errorDetalles) {
    throw new Error(errorDetalles.message)
  }

  // La copia nace "pendiente", con la fecha de hoy (no la de la original) y
  // sin el amarre a ninguna orden de venta — es una cotización nueva e
  // independiente, aunque haya copiado los datos de otra.
  const { data: copia, error: errorCopia } = await supabase
    .from('cotizaciones')
    .insert({
      cliente_id: original.cliente_id,
      fecha: hoyPeruISO(),
      dias_credito: original.dias_credito,
      medio_pago: original.medio_pago,
      vendedor_id: original.vendedor_id,
      usuario_id: user?.id ?? null,
      observacion: original.observacion,
      moneda: original.moneda,
      documento_referencia: original.documento_referencia,
      vigencia_dias: original.vigencia_dias,
      descuento_tipo: original.descuento_tipo,
      descuento_valor: original.descuento_valor,
      descuento_monto: original.descuento_monto,
      subtotal: original.subtotal,
      igv: original.igv,
      total: original.total,
    })
    .select('id')
    .single()

  if (errorCopia || !copia) {
    throw new Error(errorCopia?.message ?? 'No se pudo duplicar la cotización.')
  }

  if (detalles && detalles.length > 0) {
    const { error: errorDetalleCopia } = await supabase.from('detalle_cotizacion').insert(
      detalles.map((l) => ({
        cotizacion_id: copia.id,
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        caracteristicas: l.caracteristicas,
        fecha_entrega: l.fecha_entrega,
        unidad_nombre: l.unidad_nombre,
        tipo_afectacion_igv: l.tipo_afectacion_igv,
      }))
    )

    if (errorDetalleCopia) {
      throw new Error(errorDetalleCopia.message)
    }
  }

  revalidatePath('/cotizaciones')
  redirect(`/cotizaciones/${copia.id}/editar`)
}

export async function enviarCorreoCotizacion(destinatario: string, asunto: string, cuerpo: string) {
  if (!(await tienePermiso('cotizaciones'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  if (!destinatario.trim() || !destinatario.includes('@')) {
    throw new Error('Ingresa un correo de destino válido.')
  }
  if (!asunto.trim()) {
    throw new Error('El asunto no puede estar vacío.')
  }
  if (!cuerpo.trim()) {
    throw new Error('El mensaje no puede estar vacío.')
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'El envío de correo no está configurado (faltan variables SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS).'
    )
  }

  // nodemailer 8.x resuelve el host probando IPv4 y IPv6 en paralelo y deja
  // que gane el que responda — en esta red esa carrera tarda minuto y medio
  // en resolverse (probado: 115-128s) aunque una conexión IPv4 directa tarda
  // ~2s. Se resuelve la IPv4 a mano con dns.lookup (el resolver del sistema
  // operativo — dns.resolve4/dns.promises.resolve4, que consulta DNS en crudo
  // por UDP, también se probó y falló con ETIMEOUT en esta misma red) y se
  // conecta directo a esa IP, con `servername` para que la validación del
  // certificado TLS siga viendo "smtp.gmail.com" (si no, el handshake falla
  // porque el certificado no es válido para la IP). Si la resolución manual
  // falla, se cae al hostname normal y que nodemailer haga lo suyo (más
  // lento, pero funciona).
  let hostConexion = SMTP_HOST
  try {
    const { address } = await lookup(SMTP_HOST, { family: 4 })
    if (address) hostConexion = address
  } catch {
    // sin resolución manual disponible — se usa el hostname tal cual
  }

  // `servername` tampoco está en el tipo Options de @types/nodemailer
  // (va rezagado respecto a nodemailer 8.x), aunque sí existe en runtime —
  // se agrega con Object.assign para no perder el chequeo de tipos del
  // resto de opciones.
  const transporte = nodemailer.createTransport(
    Object.assign(
      {
        host: hostConexion,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      },
      { servername: SMTP_HOST }
    )
  )

  try {
    await transporte.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: destinatario.trim(),
      subject: asunto.trim(),
      text: cuerpo,
    })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar el correo.'
    throw new Error(`No se pudo enviar el correo: ${mensaje}`)
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

// Crea la orden de venta por dentro (igual que antes) pero en vez de dejar
// al usuario en la lista de Ventas para que busque el botón "Facturar", lo
// manda directo a emitir la factura/boleta — para quien cotiza y factura no
// hay diferencia visible entre "cotización → venta → factura" y "cotización
// → factura", pero por dentro se sigue pasando por la orden de venta: ahí es
// donde se puede anular gratis (sin Nota de Crédito) y es el único lugar del
// código que descuenta stock y llama a NUBEFACT — no se duplica esa lógica.
export async function crearFacturaDesdeCotizacion(cotizacionId: number) {
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
    .select('producto_id, cantidad, precio_unitario, tipo_afectacion_igv')
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
      tipo_afectacion_igv: d.tipo_afectacion_igv,
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
  redirect(`/ventas/${orden.id}/facturar`)
}
