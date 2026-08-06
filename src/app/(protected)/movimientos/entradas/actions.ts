'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { fechaDocumentoFueraDeRango } from '@/lib/fecha'

export type EstadoFormulario = { error: string | null }

type ItemEntrada = {
  producto_id: number
  cantidad: number
  costo_unitario: number
  lote: string | null
  fecha_vencimiento: string | null
}

export async function crearEntrada(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('movimientos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const fecha = formData.get('fecha') as string
  const motivo = formData.get('motivo') as string
  const motivoOtro = (formData.get('motivo_otro') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const razonSocial = (formData.get('razon_social') as string)?.trim()
  const documentoTipo = (formData.get('documento_tipo') as string)?.trim()
  const documentoOtro = (formData.get('documento_otro') as string)?.trim()
  const documentoSerie = (formData.get('documento_serie') as string)?.trim()
  const documentoCorrelativo = (formData.get('documento_correlativo') as string)?.trim()
  const observaciones = (formData.get('observaciones') as string)?.trim()
  const itemsRaw = formData.get('items') as string

  if (!fecha) {
    return { error: 'La fecha de ingreso es obligatoria.' }
  }
  if (fechaDocumentoFueraDeRango(fecha)) {
    return { error: 'La fecha no puede ser futura ni atrasarse más de 3 días.' }
  }
  if (!motivo) {
    return { error: 'Selecciona un motivo.' }
  }
  if (motivo === 'otro' && !motivoOtro) {
    return { error: 'Especifica el motivo.' }
  }
  const esCompra = motivo === 'compra'
  if (esCompra && !/^\d{11}$/.test(ruc || '')) {
    return { error: 'El RUC del proveedor es obligatorio (11 dígitos) cuando el motivo es Compra.' }
  }
  if (documentoTipo === 'otro' && !documentoOtro) {
    return { error: 'Especifica el tipo de documento.' }
  }

  let items: ItemEntrada[]
  try {
    items = JSON.parse(itemsRaw || '[]')
  } catch {
    return { error: 'Los ítems de la entrada no son válidos.' }
  }

  items = items.filter((it) => it.producto_id && it.cantidad > 0)
  if (items.length === 0) {
    return { error: 'Agrega al menos un ítem a la entrada.' }
  }
  if (items.some((it) => it.costo_unitario < 0)) {
    return { error: 'El costo unitario no puede ser negativo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let proveedorId: number | null = null
  if (ruc) {
    const { data: proveedor } = await supabase.from('proveedores').select('id').eq('ruc', ruc).maybeSingle()
    proveedorId = proveedor?.id ?? null
  }

  const { data: cabecera, error: errorCabecera } = await supabase
    .from('entradas_cabecera')
    .insert({
      fecha,
      usuario_id: user?.id ?? null,
      motivo,
      motivo_otro: motivo === 'otro' ? motivoOtro : null,
      proveedor_id: proveedorId,
      proveedor_ruc: ruc || null,
      proveedor_razon_social: razonSocial || null,
      documento_tipo: documentoTipo || null,
      documento_otro: documentoTipo === 'otro' ? documentoOtro : null,
      documento_serie: documentoSerie || null,
      documento_correlativo: documentoCorrelativo || null,
      observaciones: observaciones || null,
    })
    .select('id, numero')
    .single()

  if (errorCabecera || !cabecera) {
    return { error: errorCabecera?.message ?? 'No se pudo crear la entrada.' }
  }

  const { error: errorMovs } = await supabase.from('movimientos').insert(
    items.map((it) => ({
      producto_id: it.producto_id,
      tipo: 'entrada',
      cantidad: it.cantidad,
      costo_unitario: it.costo_unitario,
      usuario_id: user?.id ?? null,
      motivo: motivo === 'otro' ? motivoOtro : motivo,
      referencia: cabecera.numero,
      entrada_cabecera_id: cabecera.id,
      lote: it.lote || null,
      fecha_vencimiento: it.fecha_vencimiento || null,
    }))
  )

  if (errorMovs) {
    // La cabecera queda huérfana si esto falla — no se puede "deshacer" el
    // insert (no hay política de delete, a propósito), pero sin movimientos
    // ligados no afecta stock ni aparece con ítems en el listado.
    return { error: errorMovs.message }
  }

  revalidatePath('/movimientos/entradas')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
  redirect('/movimientos/entradas')
}
