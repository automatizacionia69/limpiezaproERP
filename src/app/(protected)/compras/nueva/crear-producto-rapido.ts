'use server'

import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { sugerirSku } from '../../productos/actions'
import { validarCamposCodigo, mensajeErrorGuardado } from '@/lib/productos-validacion'

export type ProductoCreado = { id: number; nombre: string }
export type ResultadoCrearProducto = { producto: ProductoCreado } | { error: string }

export type DatosProductoRapido = {
  nombre: string
  sku: string
  codigoBarras: string
  marca: string
  unidadId: number | ''
  categoriaId: number | ''
  puntoReorden: string
}

/**
 * Alta rápida de producto desde el flujo manual de Compras ("+ Crear
 * producto nuevo" en el buscador de una línea). A diferencia de
 * `crearProductoRapido` (usada por el flujo automático de lectura de
 * facturas por IA), esta pide los mismos campos y aplica exactamente las
 * mismas validaciones que el alta completa en Productos → Nuevo
 * (`crearProducto`), pero sin `redirect()`: devuelve el producto creado
 * para que la compra en curso pueda seguir sin perder contexto. cantidad y
 * costo quedan en 0 — igual que el alta completa — el stock/costo real se
 * fija recién cuando la orden se marca "Recibida" (aplicar_movimiento()).
 * precio_venta queda sin definir acá a propósito: en este contexto lo que
 * importa es cuánto se paga (precio de compra, capturado aparte en el
 * modal para precargar la línea de la orden), no a cuánto se va a vender —
 * eso se define después, en Productos.
 */
export async function crearProductoDesdeCompra(datos: DatosProductoRapido): Promise<ResultadoCrearProducto> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombre = datos.nombre.trim()
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!datos.unidadId) {
    return { error: 'La unidad es obligatoria.' }
  }

  const campos = validarCamposCodigo(datos.sku, datos.codigoBarras)
  if ('error' in campos) {
    return { error: campos.error }
  }

  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .insert({
      nombre,
      unidad_id: Number(datos.unidadId),
      sku: campos.sku,
      codigo_barras: campos.codigoBarras,
      marca: datos.marca.trim() || null,
      categoria_id: datos.categoriaId ? Number(datos.categoriaId) : null,
      punto_reorden: datos.puntoReorden ? Number(datos.puntoReorden) : 0,
      activo: true,
      cantidad: 0,
      costo: 0,
    })
    .select('id, nombre')
    .single()

  if (error || !producto) {
    return { error: mensajeErrorGuardado(error ?? { message: 'No se pudo crear el producto.' }) }
  }

  return { producto }
}

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
