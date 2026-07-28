'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

export async function crearProducto(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const unidadId = formData.get('unidad_id') as string
  const codigo = (formData.get('codigo') as string)?.trim()
  const categoriaId = formData.get('categoria_id') as string
  const precioVenta = formData.get('precio_venta') as string
  const puntoReorden = formData.get('punto_reorden') as string

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!unidadId) {
    return { error: 'La unidad es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('productos').insert({
    nombre,
    unidad_id: Number(unidadId),
    codigo: codigo || null,
    categoria_id: categoriaId ? Number(categoriaId) : null,
    precio_venta: precioVenta ? Number(precioVenta) : null,
    punto_reorden: puntoReorden ? Number(puntoReorden) : 0,
    cantidad: 0,
    costo: 0,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/productos')
}

export async function editarProducto(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const unidadId = formData.get('unidad_id') as string
  const codigo = (formData.get('codigo') as string)?.trim()
  const categoriaId = formData.get('categoria_id') as string
  const zonaId = formData.get('zona_id') as string
  const precioVenta = formData.get('precio_venta') as string
  const puntoReorden = formData.get('punto_reorden') as string

  if (!id) {
    return { error: 'Producto inválido.' }
  }
  if (!nombre) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (!unidadId) {
    return { error: 'La unidad es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('productos')
    .update({
      nombre,
      unidad_id: Number(unidadId),
      codigo: codigo || null,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      zona_id: zonaId ? Number(zonaId) : null,
      precio_venta: precioVenta ? Number(precioVenta) : null,
      punto_reorden: puntoReorden ? Number(puntoReorden) : 0,
    })
    .eq('id', Number(id))

  if (error) {
    return { error: error.message }
  }

  redirect('/productos')
}
