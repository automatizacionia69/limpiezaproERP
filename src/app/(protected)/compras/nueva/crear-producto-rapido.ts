'use server'

import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { sugerirSku } from '../../productos/actions'

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

  // No hay categoria al crear desde una factura leida por IA: sugerirSku cae
  // al prefijo "GEN" (mismo criterio que el backfill de la migracion). Esta
  // funcion se llama en paralelo (Promise.all en nueva-compra-form.tsx, una
  // vez por cada producto sin match detectado en la misma factura), asi que
  // dos llamadas pueden sugerir el mismo SKU antes de que la primera termine
  // de insertar — se reintenta con un sufijo aleatorio si el insert choca
  // contra el UNIQUE de sku.
  for (let intento = 0; intento < 3; intento++) {
    const base = await sugerirSku(null)
    const sku = intento === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`

    const { data: producto, error } = await supabase
      .from('productos')
      .insert({
        nombre: nombreLimpio,
        unidad_id: unidadId,
        sku,
        activo: true,
        cantidad: 0,
        costo: Math.max(0, costo) || 0,
      })
      .select('id, nombre')
      .single()

    if (!error && producto) {
      return { producto }
    }
    if (!error || error.code !== '23505' || intento === 2) {
      return { error: error?.message ?? 'No se pudo crear el producto.' }
    }
  }

  return { error: 'No se pudo generar un SKU único, intenta de nuevo.' }
}
