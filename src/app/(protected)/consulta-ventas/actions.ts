'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { MOTIVOS_NOTA_CREDITO } from '@/lib/motivos'

export type EstadoFormulario = { error: string | null }

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

  const { error: errorNc } = await supabase.from('notas_credito').insert({
    comprobante_id: comprobante.id,
    motivo: motivoInfo.label,
    anula_operacion: motivoInfo.anula,
    monto: comprobante.total,
    observacion: observacion || null,
    usuario_id: user?.id ?? null,
  })

  if (errorNc) {
    return { error: errorNc.message }
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
      const { error: errorMovs } = await supabase.from('movimientos').insert(
        detalles.map((d) => ({
          producto_id: d.producto_id,
          tipo: 'entrada',
          cantidad: d.cantidad,
          costo_unitario: 0,
          usuario_id: user?.id ?? null,
          motivo: `Anulación ${comprobante.numero} (Nota de Crédito)`,
          referencia: comprobante.numero,
        }))
      )

      if (errorMovs) {
        return { error: errorMovs.message }
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
