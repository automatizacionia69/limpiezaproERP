'use server'

import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type ProductoCreado = { id: number; nombre: string }
export type ResultadoCrearProducto = { producto: ProductoCreado } | { error: string }

export async function crearProductoRapido(nombre: string, costo: number): Promise<ResultadoCrearProducto> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) {
    return { error: 'Nombre de producto inválido.' }
  }

  const supabase = await createClient()

  // No hay forma de saber la unidad de medida a partir de la factura: se usa
  // "Unidad" si existe, o la primera unidad configurada como respaldo. El
  // usuario puede corregirla despues editando el producto.
  const { data: unidadUnidad } = await supabase
    .from('unidades_medida')
    .select('id')
    .ilike('nombre', 'unidad')
    .maybeSingle()

  let unidadId = unidadUnidad?.id as number | undefined

  if (!unidadId) {
    const { data: primeraUnidad } = await supabase
      .from('unidades_medida')
      .select('id')
      .order('id')
      .limit(1)
      .maybeSingle()
    unidadId = primeraUnidad?.id
  }

  if (!unidadId) {
    return { error: 'No hay unidades de medida configuradas — crea una primero en Unidades.' }
  }

  const { data: producto, error } = await supabase
    .from('productos')
    .insert({
      nombre: nombreLimpio,
      unidad_id: unidadId,
      cantidad: 0,
      costo: Math.max(0, costo) || 0,
    })
    .select('id, nombre')
    .single()

  if (error || !producto) {
    return { error: error?.message ?? 'No se pudo crear el producto.' }
  }

  return { producto }
}
