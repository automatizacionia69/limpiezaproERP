import type { SupabaseClient } from '@supabase/supabase-js'

type DetalleRow = {
  id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  productos: { nombre: string } | null
}

/**
 * Datos que necesitan las páginas de Nota de Crédito y Anular documento —
 * factorizado desde consulta-ventas/[id]/page.tsx para no repetir el cálculo
 * de saldo acreditable ni la consolidación de líneas vendidas en cada página.
 */
export async function obtenerDatosParaAnular(supabase: SupabaseClient, comprobanteId: string) {
  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select(
      'id, tipo, numero, total, estado, fecha_emision, orden_venta_id, clientes(nombre, documento)'
    )
    .eq('id', comprobanteId)
    .single()

  if (!comprobante) return null

  const cliente = Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes

  const [{ data: detalles }, { data: notasCredito }, { data: notasDebito }] = await Promise.all([
    supabase
      .from('detalle_venta')
      .select('id, producto_id, cantidad, precio_unitario, productos(nombre)')
      .eq('orden_id', comprobante.orden_venta_id)
      .returns<DetalleRow[]>(),
    supabase.from('notas_credito').select('id, monto').eq('comprobante_id', comprobante.id),
    supabase.from('notas_debito').select('monto').eq('comprobante_id', comprobante.id),
  ])

  const idsNotasCredito = (notasCredito ?? []).map((n) => n.id)
  const yaDevueltoPorProducto = new Map<number, number>()
  if (idsNotasCredito.length > 0) {
    const { data: detallesNc } = await supabase
      .from('detalle_nota_credito')
      .select('producto_id, cantidad')
      .in('nota_credito_id', idsNotasCredito)
    for (const d of detallesNc ?? []) {
      yaDevueltoPorProducto.set(d.producto_id, (yaDevueltoPorProducto.get(d.producto_id) ?? 0) + Number(d.cantidad))
    }
  }

  const totalNotasCredito = (notasCredito ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const totalNotasDebito = (notasDebito ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const saldoActual = Math.max(0, Number(comprobante.total) - totalNotasCredito + totalNotasDebito)

  // Se consolidan las lineas por producto: dos filas del mismo producto
  // indexaban la misma casilla del formulario y la nota se emitia por el
  // doble, reingresando el doble de stock.
  const vendidoPorProducto = new Map<number, { nombre: string; cantidad: number; importe: number }>()
  for (const d of detalles ?? []) {
    const previo = vendidoPorProducto.get(d.producto_id)
    vendidoPorProducto.set(d.producto_id, {
      nombre: previo?.nombre ?? d.productos?.nombre ?? `Producto #${d.producto_id}`,
      cantidad: (previo?.cantidad ?? 0) + Number(d.cantidad),
      importe: (previo?.importe ?? 0) + Number(d.cantidad) * Number(d.precio_unitario),
    })
  }

  const lineasParaAnular = [...vendidoPorProducto.entries()].map(([productoId, v]) => ({
    producto_id: productoId,
    nombre: v.nombre,
    cantidadVendida: v.cantidad,
    precioUnitario: v.cantidad > 0 ? v.importe / v.cantidad : 0,
    cantidadDisponible: v.cantidad - (yaDevueltoPorProducto.get(productoId) ?? 0),
  }))

  return { comprobante, cliente, saldoActual, lineasParaAnular }
}
