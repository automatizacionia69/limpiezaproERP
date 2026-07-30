'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { MOTIVOS_NOTA_CREDITO } from '@/lib/motivos'
import { calcularImportes } from '@/lib/cotizaciones'

export type EstadoFormulario = { error: string | null }

type LineaDevolucion = { producto_id: number; cantidad: number; precio_unitario: number }

/**
 * Agrupa por producto las lineas que llegan del formulario.
 *
 * El formulario de devolucion indexa las cantidades por producto_id, asi que si
 * la venta tenia dos lineas del MISMO producto, ambas leian la misma casilla y
 * la nota se emitia por el doble del monto reingresando el doble de stock.
 */
function agruparPorProducto(lineas: LineaDevolucion[]): Map<number, number> {
  const porProducto = new Map<number, number>()
  for (const l of lineas) {
    porProducto.set(l.producto_id, (porProducto.get(l.producto_id) ?? 0) + Number(l.cantidad))
  }
  return porProducto
}

export async function anularComprobante(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('consulta_ventas'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const comprobanteId = Number(formData.get('comprobante_id'))
  const codigoMotivo = formData.get('motivo') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string | null

  const motivoInfo = MOTIVOS_NOTA_CREDITO.find((m) => m.codigo === codigoMotivo)
  if (!motivoInfo) {
    return { error: 'Selecciona un motivo válido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: comprobante, error: errorComp } = await supabase
    .from('comprobantes')
    .select('id, tipo, numero, estado, total, orden_venta_id')
    .eq('id', comprobanteId)
    .single()

  if (errorComp || !comprobante) {
    return { error: 'Comprobante no encontrado.' }
  }
  if (comprobante.estado !== 'emitido') {
    return { error: 'Este comprobante ya fue anulado.' }
  }

  // La reversión de stock se hace con una función de la base (revertir_stock_nc)
  // porque insertar en `movimientos` está restringido a admin/almacén por RLS,
  // mientras que emitir notas de crédito también lo puede hacer el rol `ventas`.
  // Antes eso hacía que un usuario de ventas dejara la nota de crédito grabada
  // con el stock SIN devolver y el comprobante todavía vigente, y cada reintento
  // emitía otra nota.
  const revertirStock = async (
    items: { producto_id: number; cantidad: number }[],
    motivo: string
  ): Promise<string | null> => {
    if (items.length === 0) return null
    const { error } = await supabase.rpc('revertir_stock_nc', {
      p_items: items,
      p_motivo: motivo,
      p_referencia: comprobante.numero,
    })
    return error?.message ?? null
  }

  // Saldo realmente acreditable: el total del comprobante mas las notas de
  // debito, menos lo que ya se acredito en notas de credito previas. Antes solo
  // se comparaba contra el total original, asi que dos notas por el total
  // completo pasaban las dos y el comprobante quedaba con el doble acreditado.
  const [{ data: ncPrevias }, { data: ndPrevias }] = await Promise.all([
    supabase.from('notas_credito').select('id, monto').eq('comprobante_id', comprobante.id),
    supabase.from('notas_debito').select('monto').eq('comprobante_id', comprobante.id),
  ])

  const yaAcreditado = (ncPrevias ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const totalDebitos = (ndPrevias ?? []).reduce((acc, n) => acc + Number(n.monto), 0)
  const saldoAcreditable = Number(comprobante.total) + totalDebitos - yaAcreditado

  if (saldoAcreditable <= 0) {
    return {
      error: `Este comprobante ya está acreditado por completo (S/ ${yaAcreditado.toFixed(2)} de S/ ${(Number(comprobante.total) + totalDebitos).toFixed(2)}).`,
    }
  }

  let lineas: LineaDevolucion[] = []
  let monto = Number(comprobante.total)

  if (!motivoInfo.anula && !motivoInfo.itemizable) {
    const montoManual = Number(formData.get('monto'))
    if (!montoManual || montoManual <= 0) {
      return { error: 'Ingresa el monto de la nota de crédito.' }
    }
    if (montoManual > saldoAcreditable + 0.005) {
      return {
        error: `El monto no puede superar el saldo pendiente de S/ ${saldoAcreditable.toFixed(2)}.`,
      }
    }
    monto = montoManual
  }

  if (motivoInfo.itemizable) {
    try {
      lineas = JSON.parse(lineasRaw || '[]')
    } catch {
      return { error: 'Las líneas seleccionadas no son válidas.' }
    }
    lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
    if (lineas.length === 0) {
      return { error: 'Selecciona al menos un producto y la cantidad a aplicar.' }
    }
    if (lineas.some((l) => !Number.isInteger(l.cantidad))) {
      return { error: 'La cantidad a aplicar debe ser un número entero.' }
    }

    const { data: vendidos } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad, precio_unitario')
      .eq('orden_id', comprobante.orden_venta_id)

    // Lo vendido por producto, consolidando las lineas repetidas del mismo
    // producto y guardando el precio promedio ponderado realmente facturado.
    const vendidoPorProducto = new Map<number, { cantidad: number; importe: number }>()
    for (const d of vendidos ?? []) {
      const previo = vendidoPorProducto.get(d.producto_id) ?? { cantidad: 0, importe: 0 }
      vendidoPorProducto.set(d.producto_id, {
        cantidad: previo.cantidad + Number(d.cantidad),
        importe: previo.importe + Number(d.cantidad) * Number(d.precio_unitario),
      })
    }

    const idsNotasPrevias = (ncPrevias ?? []).map((n) => n.id)
    const devueltoPorProducto = new Map<number, number>()
    if (idsNotasPrevias.length > 0) {
      const { data: detallesPrevios } = await supabase
        .from('detalle_nota_credito')
        .select('producto_id, cantidad')
        .in('nota_credito_id', idsNotasPrevias)
      for (const d of detallesPrevios ?? []) {
        devueltoPorProducto.set(d.producto_id, (devueltoPorProducto.get(d.producto_id) ?? 0) + Number(d.cantidad))
      }
    }

    // Se agrupa lo que llega del formulario y se descarta el precio que vino en
    // el payload: el precio unitario se toma de detalle_venta, que es la unica
    // fuente confiable de a cuanto se vendio de verdad.
    const solicitado = agruparPorProducto(lineas)
    const lineasConsolidadas: LineaDevolucion[] = []

    for (const [productoId, cantidad] of solicitado) {
      const vendido = vendidoPorProducto.get(productoId)
      if (!vendido || vendido.cantidad <= 0) {
        return { error: 'Uno de los productos seleccionados no figura en esta venta.' }
      }

      const disponible = vendido.cantidad - (devueltoPorProducto.get(productoId) ?? 0)
      if (cantidad > disponible) {
        return {
          error: `La cantidad a aplicar (${cantidad}) excede lo disponible para devolver/ajustar en ese producto (${disponible}).`,
        }
      }

      lineasConsolidadas.push({
        producto_id: productoId,
        cantidad,
        precio_unitario: vendido.importe / vendido.cantidad,
      })
    }

    lineas = lineasConsolidadas

    // El monto de la nota incluye IGV, igual que comprobante.total: los reportes
    // dividen por 1.18 para obtener el neto, asi que las dos ramas (anulacion
    // total y devolucion por item) tienen que usar la misma convencion.
    monto = calcularImportes(lineas).total

    if (monto > saldoAcreditable + 0.005) {
      return {
        error: `El monto calculado (S/ ${monto.toFixed(2)}) supera el saldo pendiente de S/ ${saldoAcreditable.toFixed(2)}.`,
      }
    }
  }

  const { data: notaCredito, error: errorNc } = await supabase
    .from('notas_credito')
    .insert({
      comprobante_id: comprobante.id,
      motivo: motivoInfo.label,
      anula_operacion: motivoInfo.anula,
      monto,
      observacion: observacion || null,
      usuario_id: user?.id ?? null,
    })
    .select('id')
    .single()

  if (errorNc || !notaCredito) {
    return { error: errorNc?.message ?? 'No se pudo registrar la nota de crédito.' }
  }

  if (motivoInfo.itemizable) {
    const { error: errorDetalleNc } = await supabase.from('detalle_nota_credito').insert(
      lineas.map((l) => ({
        nota_credito_id: notaCredito.id,
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      }))
    )
    if (errorDetalleNc) {
      return { error: errorDetalleNc.message }
    }
  }

  if (motivoInfo.anula) {
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad')
      .eq('orden_id', comprobante.orden_venta_id)

    if (errorDetalles) {
      return { error: errorDetalles.message }
    }

    if (detalles && detalles.length > 0) {
      // Se consolidan las lineas repetidas del mismo producto antes de revertir.
      const errorMovs = await revertirStock(
        [...agruparPorProducto(
          detalles.map((d) => ({
            producto_id: d.producto_id,
            cantidad: Number(d.cantidad),
            precio_unitario: 0,
          }))
        )].map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
        `Anulación ${comprobante.numero} (Nota de Crédito)`
      )

      if (errorMovs) {
        return { error: errorMovs }
      }
    }

    const { error: errorEstadoComp } = await supabase
      .from('comprobantes')
      .update({ estado: 'anulado' })
      .eq('id', comprobante.id)

    if (errorEstadoComp) {
      return { error: errorEstadoComp.message }
    }

    await supabase.from('ordenes_venta').update({ estado: 'anulada' }).eq('id', comprobante.orden_venta_id)
  } else if (motivoInfo.reversaStock) {
    // Devolución por ítem: solo revierte stock de las cantidades seleccionadas.
    // `lineas` ya viene consolidado por producto y con el precio del servidor.
    const errorMovs = await revertirStock(
      lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
      `Devolución por ítem ${comprobante.numero} (Nota de Crédito ${notaCredito.id})`
    )
    if (errorMovs) {
      return { error: errorMovs }
    }
  }

  revalidatePath('/consulta-ventas')
  revalidatePath(`/consulta-ventas/${comprobante.id}`)
  revalidatePath('/ventas')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')

  return { error: null }
}

export async function crearNotaDebito(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('consulta_ventas'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const comprobanteId = Number(formData.get('comprobante_id'))
  const motivo = (formData.get('motivo') as string)?.trim()
  const monto = Number(formData.get('monto'))
  const observacion = (formData.get('observacion') as string)?.trim()

  if (!motivo) {
    return { error: 'Selecciona un motivo.' }
  }
  if (!monto || monto <= 0) {
    return { error: 'Ingresa un monto válido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: comprobante, error: errorComp } = await supabase
    .from('comprobantes')
    .select('id, estado')
    .eq('id', comprobanteId)
    .single()

  if (errorComp || !comprobante) {
    return { error: 'Comprobante no encontrado.' }
  }
  if (comprobante.estado !== 'emitido') {
    return { error: 'No se puede emitir una nota de débito sobre un comprobante anulado.' }
  }

  const { error } = await supabase.from('notas_debito').insert({
    comprobante_id: comprobante.id,
    motivo,
    monto,
    observacion: observacion || null,
    usuario_id: user?.id ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/consulta-ventas/${comprobante.id}`)
  return { error: null }
}
