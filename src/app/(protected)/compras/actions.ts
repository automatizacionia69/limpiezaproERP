'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { fechaDocumentoFueraDeRango } from '@/lib/fecha'
import { calcularImportes } from '@/lib/cotizaciones'

export type EstadoFormulario = { error: string | null }

export type LineaDetalleCompra = {
  sku: string | null
  nombre: string | null
  cantidad: number
  costo_unitario: number
}

export type DetalleCompra = {
  id: number
  numero: string
  estado: string
  creado_en: string
  recibida_en: string | null
  fecha_registro: string
  tipo_documento: string
  documento_serie: string | null
  documento_numero: string | null
  observacion: string | null
  proveedor: string | null
  lineas: LineaDetalleCompra[]
  subtotal: number
  igv: number
  total: number
}

type OrdenRaw = {
  id: number
  numero: string
  estado: string
  creado_en: string
  recibida_en: string | null
  fecha_registro: string
  tipo_documento: string
  documento_serie: string | null
  documento_numero: string | null
  observacion: string | null
  proveedores: { nombre: string } | { nombre: string }[] | null
}

type LineaRaw = {
  cantidad: number
  costo_unitario: number
  productos: { nombre: string; sku: string } | { nombre: string; sku: string }[] | null
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

/** Detalle de una orden para el popup "Ver" de la tabla de Compras — misma consulta que antes vivía en /compras/[id]. */
export async function obtenerDetalleCompra(id: number): Promise<{ orden: DetalleCompra } | { error: string }> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const supabase = await createClient()

  const { data: orden } = await supabase
    .from('ordenes_compra')
    .select(
      'id, numero, estado, creado_en, recibida_en, fecha_registro, tipo_documento, documento_serie, documento_numero, observacion, proveedores(nombre)'
    )
    .eq('id', id)
    .single()
    .returns<OrdenRaw>()

  if (!orden) {
    return { error: 'No se encontró la orden.' }
  }

  const { data: lineasRaw } = await supabase
    .from('detalle_compra')
    .select('cantidad, costo_unitario, productos(nombre, sku)')
    .eq('orden_id', orden.id)
    .order('id')
    .returns<LineaRaw[]>()

  const lineas: LineaDetalleCompra[] = (lineasRaw ?? []).map((l) => {
    const producto = unoDe(l.productos)
    return {
      sku: producto?.sku ?? null,
      nombre: producto?.nombre ?? null,
      cantidad: l.cantidad,
      costo_unitario: l.costo_unitario,
    }
  })

  const { subtotal, igv, total } = calcularImportes(
    lineas.map((l) => ({ cantidad: l.cantidad, precio_unitario: l.costo_unitario }))
  )

  return {
    orden: {
      id: orden.id,
      numero: orden.numero,
      estado: orden.estado,
      creado_en: orden.creado_en,
      recibida_en: orden.recibida_en,
      fecha_registro: orden.fecha_registro,
      tipo_documento: orden.tipo_documento,
      documento_serie: orden.documento_serie,
      documento_numero: orden.documento_numero,
      observacion: orden.observacion,
      proveedor: unoDe(orden.proveedores)?.nombre ?? null,
      lineas,
      subtotal,
      igv,
      total,
    },
  }
}

type Linea = { producto_id: number; cantidad: number; costo_unitario: number }

export async function crearOrdenCompra(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const proveedorId = formData.get('proveedor_id') as string
  const observacion = (formData.get('observacion') as string)?.trim()
  const fechaRegistro = formData.get('fecha_registro') as string
  const tipoDocumento = formData.get('tipo_documento') as string
  const documentoSerie = (formData.get('documento_serie') as string)?.trim()
  const documentoNumero = (formData.get('documento_numero') as string)?.trim()
  const lineasRaw = formData.get('lineas') as string

  if (!proveedorId) {
    return { error: 'Selecciona un proveedor.' }
  }
  if (!fechaRegistro) {
    return { error: 'Selecciona la fecha de registro.' }
  }
  if (fechaDocumentoFueraDeRango(fechaRegistro)) {
    return { error: 'La fecha de registro no puede ser futura ni atrasarse más de 3 días.' }
  }
  if (!['factura', 'boleta', 'guia_remision'].includes(tipoDocumento)) {
    return { error: 'Selecciona el tipo de documento del proveedor.' }
  }
  if (!documentoSerie || !documentoNumero) {
    return { error: 'Toda compra debe respaldarse con un documento del proveedor: registra la serie y el número.' }
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
  if (lineas.some((l) => l.costo_unitario < 0)) {
    return { error: 'El costo unitario no puede ser negativo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.costo_unitario, 0)

  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_compra')
    .insert({
      proveedor_id: Number(proveedorId),
      usuario_id: user?.id ?? null,
      observacion: observacion || null,
      fecha_registro: fechaRegistro,
      tipo_documento: tipoDocumento,
      documento_serie: documentoSerie,
      documento_numero: documentoNumero,
      total,
    })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    return { error: errorOrden?.message ?? 'No se pudo crear la orden.' }
  }

  const { error: errorDetalle } = await supabase.from('detalle_compra').insert(
    lineas.map((l) => ({
      orden_id: orden.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      costo_unitario: l.costo_unitario,
    }))
  )

  if (errorDetalle) {
    return { error: errorDetalle.message }
  }

  redirect('/compras')
}

export async function recibirOrdenCompra(id: number) {
  if (!(await tienePermiso('compras'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se RESERVA la orden antes de insertar las entradas. Es un boton de un click
  // en la lista: dos personas de almacen marcando "Recibida" casi a la vez, o un
  // fallo en el update final, duplicaban las entradas — el stock subia el doble
  // Y el trigger recalculaba el costo promedio dos veces con las mismas
  // unidades, corrompiendo productos.costo de forma no reversible.
  const { data: orden, error: errorOrden } = await supabase
    .from('ordenes_compra')
    .update({ estado: 'recibida', recibida_en: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'pendiente')
    .select('id, numero')
    .maybeSingle()

  if (errorOrden) {
    throw new Error(errorOrden.message)
  }
  if (!orden) {
    throw new Error('Esta orden ya fue recibida o anulada.')
  }

  const liberarReserva = async () => {
    await supabase
      .from('ordenes_compra')
      .update({ estado: 'pendiente', recibida_en: null })
      .eq('id', id)
  }

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_compra')
    .select('producto_id, cantidad, costo_unitario')
    .eq('orden_id', id)

  if (errorDetalles || !detalles || detalles.length === 0) {
    await liberarReserva()
    throw new Error('La orden no tiene productos.')
  }

  const { error: errorMovs } = await supabase.from('movimientos').insert(
    detalles.map((d) => ({
      producto_id: d.producto_id,
      tipo: 'entrada',
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario,
      usuario_id: user?.id ?? null,
      motivo: `Compra ${orden.numero}`,
      referencia: orden.numero,
    }))
  )

  if (errorMovs) {
    await liberarReserva()
    throw new Error(errorMovs.message)
  }

  revalidatePath('/compras')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
}

export async function anularOrdenCompra(id: number) {
  if (!(await tienePermiso('compras'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()

  const { data: orden } = await supabase
    .from('ordenes_compra')
    .select('estado')
    .eq('id', id)
    .single()

  if (!orden || orden.estado !== 'pendiente') {
    throw new Error('Solo se pueden anular órdenes pendientes.')
  }

  const { error } = await supabase.from('ordenes_compra').update({ estado: 'anulada' }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/compras')
}
