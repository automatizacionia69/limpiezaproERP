'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { AFECTACIONES_IGV, AFECTACION_IGV_DEFAULT } from '@/lib/afectacion-igv'

export type EstadoFormulario = { error: string | null }

// Debe reflejar la misma lógica que el backfill de
// add-productos-sku-marca-estado.sql: primeras 3 letras (sin tildes) del
// nombre de la categoría, o "GEN" si no tiene categoría/nombre insuficiente.
const MAPA_ACENTOS: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N',
}

function generarPrefijoSku(nombreCategoria: string | null): string {
  const base = nombreCategoria && nombreCategoria.trim() ? nombreCategoria : 'general'
  const sinTildes = base.replace(/[áéíóúñÁÉÍÓÚÑ]/g, (c) => MAPA_ACENTOS[c] ?? c)
  const soloLetras = sinTildes.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return (soloLetras + 'XXX').slice(0, 3)
}

/** Sugerencia de SKU editable para el formulario de alta — no reserva el código. */
export async function sugerirSku(categoriaId: number | null): Promise<string> {
  const supabase = await createClient()

  let nombreCategoria: string | null = null
  if (categoriaId) {
    const { data } = await supabase.from('categorias').select('nombre').eq('id', categoriaId).maybeSingle()
    nombreCategoria = data?.nombre ?? null
  }

  const prefijo = generarPrefijoSku(nombreCategoria)
  const { count } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .ilike('sku', `${prefijo}-%`)

  const siguiente = (count ?? 0) + 1
  return `${prefijo}-${String(siguiente).padStart(4, '0')}`
}

type CamposCodigo = { sku: string; codigoBarras: string | null } | { error: string }

function validarCamposCodigo(skuCrudo: string, codigoBarrasCrudo: string): CamposCodigo {
  const sku = skuCrudo.trim().toUpperCase()
  if (!sku) {
    return { error: 'El SKU es obligatorio.' }
  }
  if (!/^[A-Z0-9-]+$/.test(sku)) {
    return { error: 'El SKU solo puede tener letras, números y guiones (ej: LIM-0001).' }
  }

  const codigoBarrasLimpio = codigoBarrasCrudo.trim()
  if (!codigoBarrasLimpio) {
    return { sku, codigoBarras: null }
  }
  if (!/^\d{8,14}$/.test(codigoBarrasLimpio)) {
    return { error: 'El código de barras debe tener entre 8 y 14 dígitos numéricos (EAN/UPC/GTIN).' }
  }

  return { sku, codigoBarras: codigoBarrasLimpio }
}

/** Traduce violaciones de UNIQUE de Postgres (23505) a un mensaje entendible. */
function mensajeErrorGuardado(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    if (error.message.includes('idx_productos_sku_unique')) {
      return 'Ya existe otro producto con ese SKU. Cada SKU debe ser único.'
    }
    if (error.message.includes('idx_productos_codigo_barras_unique')) {
      return 'Ya existe otro producto con ese código de barras.'
    }
  }
  return error.message
}

export async function crearProducto(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('productos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombre = (formData.get('nombre') as string)?.trim()
  const unidadId = formData.get('unidad_id') as string
  const codigo = (formData.get('codigo') as string)?.trim()
  const marca = (formData.get('marca') as string)?.trim()
  const categoriaId = formData.get('categoria_id') as string
  const precioVenta = formData.get('precio_venta') as string
  const puntoReorden = formData.get('punto_reorden') as string
  const tipoAfectacionIgv = (formData.get('tipo_afectacion_igv') as string) || AFECTACION_IGV_DEFAULT

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!unidadId) {
    return { error: 'La unidad es obligatoria.' }
  }
  if (!AFECTACIONES_IGV.some((a) => a.codigo === tipoAfectacionIgv)) {
    return { error: 'Tipo de afectación IGV inválido.' }
  }

  const campos = validarCamposCodigo(
    (formData.get('sku') as string) ?? '',
    (formData.get('codigo_barras') as string) ?? ''
  )
  if ('error' in campos) {
    return { error: campos.error }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('productos').insert({
    nombre,
    unidad_id: Number(unidadId),
    codigo: codigo || null,
    sku: campos.sku,
    codigo_barras: campos.codigoBarras,
    marca: marca || null,
    categoria_id: categoriaId ? Number(categoriaId) : null,
    precio_venta: precioVenta ? Number(precioVenta) : null,
    punto_reorden: puntoReorden ? Number(puntoReorden) : 0,
    tipo_afectacion_igv: tipoAfectacionIgv,
    cantidad: 0,
    costo: 0,
  })

  if (error) {
    return { error: mensajeErrorGuardado(error) }
  }

  redirect('/productos')
}

export async function editarProducto(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('productos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const unidadId = formData.get('unidad_id') as string
  const codigo = (formData.get('codigo') as string)?.trim()
  const marca = (formData.get('marca') as string)?.trim()
  const categoriaId = formData.get('categoria_id') as string
  const zonaId = formData.get('zona_id') as string
  const precioVenta = formData.get('precio_venta') as string
  const puntoReorden = formData.get('punto_reorden') as string
  const tipoAfectacionIgv = (formData.get('tipo_afectacion_igv') as string) || AFECTACION_IGV_DEFAULT

  if (!id) {
    return { error: 'Producto inválido.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!unidadId) {
    return { error: 'La unidad es obligatoria.' }
  }
  if (!AFECTACIONES_IGV.some((a) => a.codigo === tipoAfectacionIgv)) {
    return { error: 'Tipo de afectación IGV inválido.' }
  }

  const campos = validarCamposCodigo(
    (formData.get('sku') as string) ?? '',
    (formData.get('codigo_barras') as string) ?? ''
  )
  if ('error' in campos) {
    return { error: campos.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('productos')
    .update({
      nombre,
      unidad_id: Number(unidadId),
      codigo: codigo || null,
      sku: campos.sku,
      codigo_barras: campos.codigoBarras,
      marca: marca || null,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      zona_id: zonaId ? Number(zonaId) : null,
      precio_venta: precioVenta ? Number(precioVenta) : null,
      punto_reorden: puntoReorden ? Number(puntoReorden) : 0,
      tipo_afectacion_igv: tipoAfectacionIgv,
    })
    .eq('id', Number(id))

  if (error) {
    return { error: mensajeErrorGuardado(error) }
  }

  redirect('/productos')
}

/**
 * Soft-disable: reemplaza al borrado en el listado de Productos. Un producto
 * inactivo sigue existiendo y editable en este módulo, pero los selectores
 * de operaciones nuevas (ventas/compras/cotizaciones/movimientos/guías) lo
 * excluyen con `.eq('activo', true)` en cada consulta.
 */
export async function cambiarEstadoProducto(id: number, activo: boolean) {
  if (!(await tienePermiso('productos'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('productos').update({ activo }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/productos')
}

/**
 * Borrado físico real. NO se usa desde ningún componente todavía — se deja
 * preparado a nivel de arquitectura para cuando exista un sistema de
 * permisos de administradores internos de nuestra empresa (distinto del rol
 * 'admin' actual, que es el dueño del negocio cliente, no nuestro equipo).
 *
 * TODO(permisos-internos): reemplazar este `return` por una verificación
 * real contra ese sistema (p.ej. tienePermisoInterno('productos.borrar'))
 * antes de conectarlo a algún botón de la UI.
 */
export async function eliminarProductoFisico(_id: number): Promise<{ error: string }> {
  return { error: 'El borrado físico de productos está reservado para administradores internos. Usa el switch Activo/Inactivo en su lugar.' }
}
