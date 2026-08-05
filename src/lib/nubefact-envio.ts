import { generarComprobanteNubefact, type TipoComprobante } from '@/lib/nubefact'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type ProductoLinea = {
  nombre: string
  codigo: string | null
  unidades_medida: { nombre: string } | null
}

type DetalleRow = {
  cantidad: number
  precio_unitario: number
  productos: ProductoLinea | null
}

/**
 * Arma el payload real (cliente + lineas del comprobante) y llama a NUBEFACT,
 * guardando el resultado en las columnas nubefact_* de `comprobantes`. Usada
 * tanto por la emision inicial (ventas/actions.ts) como por el boton
 * "Reintentar envío a SUNAT" (consulta-ventas/actions.ts) para no duplicar
 * la logica de armado del payload en dos lugares.
 *
 * No revierte nada si falla — solo deja constancia en nubefact_estado/error.
 * Esa politica de "la venta nunca se revierte por un fallo externo" se
 * decidio con el usuario al enganchar la integracion (2026-08-04).
 */
export async function enviarComprobanteANubefact(
  supabase: SupabaseServerClient,
  comprobanteId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select('id, tipo, serie, numero, cliente_id, orden_venta_id, fecha_emision')
    .eq('id', comprobanteId)
    .single()

  if (!comprobante) {
    return { ok: false, error: 'Comprobante no encontrado.' }
  }
  if (comprobante.tipo !== 'factura' && comprobante.tipo !== 'boleta') {
    return { ok: false, error: 'Este tipo de comprobante no se envía a SUNAT.' }
  }

  const [{ data: cliente }, { data: detalle }] = await Promise.all([
    supabase
      .from('clientes')
      .select('nombre, documento, direccion, email')
      .eq('id', comprobante.cliente_id)
      .single(),
    supabase
      .from('detalle_venta')
      .select('cantidad, precio_unitario, productos(nombre, codigo, unidades_medida(nombre))')
      .eq('orden_id', comprobante.orden_venta_id)
      .returns<DetalleRow[]>(),
  ])

  const numeroNubefact = Number(String(comprobante.numero).split('-').pop())
  const [anio, mes, dia] = String(comprobante.fecha_emision).split('-')

  const resultado = await generarComprobanteNubefact({
    tipo: comprobante.tipo as TipoComprobante,
    serie: comprobante.serie,
    numero: numeroNubefact,
    cliente: {
      documento: cliente?.documento ?? '',
      denominacion: cliente?.nombre ?? '',
      direccion: cliente?.direccion ?? undefined,
      email: cliente?.email ?? undefined,
    },
    fechaEmision: `${dia}-${mes}-${anio}`,
    lineas: (detalle ?? []).map((l) => ({
      descripcion: l.productos?.nombre ?? 'PRODUCTO',
      codigo: l.productos?.codigo ?? undefined,
      unidadErp: l.productos?.unidades_medida?.nombre ?? 'und',
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  })

  if (resultado.ok) {
    await supabase
      .from('comprobantes')
      .update({
        nubefact_estado: 'enviado',
        nubefact_enlace: resultado.data.enlace,
        nubefact_enlace_pdf: resultado.data.enlace_del_pdf,
        nubefact_enlace_xml: resultado.data.enlace_del_xml,
        nubefact_enlace_cdr: resultado.data.enlace_del_cdr,
        nubefact_codigo_hash: resultado.data.codigo_hash,
        nubefact_enviado_en: new Date().toISOString(),
        nubefact_error: null,
      })
      .eq('id', comprobanteId)
    return { ok: true }
  }

  await supabase
    .from('comprobantes')
    .update({ nubefact_estado: 'error', nubefact_error: resultado.error })
    .eq('id', comprobanteId)
  return { ok: false, error: resultado.error }
}
