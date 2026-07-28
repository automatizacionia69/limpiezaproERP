'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null }

export async function crearProveedor(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const contacto = (formData.get('contacto') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!nombre) {
    return { error: 'La razón social es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('proveedores').insert({
    nombre,
    ruc: ruc || null,
    contacto: contacto || null,
    telefono: telefono || null,
    email: email || null,
    direccion: direccion || null,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/proveedores')
}

export async function editarProveedor(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const contacto = (formData.get('contacto') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()

  if (!id) {
    return { error: 'Proveedor inválido.' }
  }
  if (!nombre) {
    return { error: 'La razón social es obligatoria.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('proveedores')
    .update({
      nombre,
      ruc: ruc || null,
      contacto: contacto || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
    })
    .eq('id', Number(id))

  if (error) {
    return { error: error.message }
  }

  redirect('/proveedores')
}

export async function eliminarProveedor(id: number) {
  const supabase = await createClient()

  const { error } = await supabase.from('proveedores').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'No se puede eliminar: este proveedor ya tiene órdenes de compra registradas.'
      )
    }
    throw new Error(error.message)
  }

  revalidatePath('/proveedores')
}

export type ResultadoBusquedaRuc = { nombre: string } | { error: string }

export async function buscarRazonSocialPorRuc(ruc: string): Promise<ResultadoBusquedaRuc> {
  const rucLimpio = ruc.trim()

  if (!/^\d{11}$/.test(rucLimpio)) {
    return { error: 'El RUC debe tener 11 dígitos.' }
  }

  const token = process.env.DECOLECTA_API_TOKEN
  if (!token) {
    return { error: 'Falta configurar DECOLECTA_API_TOKEN en el servidor.' }
  }

  try {
    const res = await fetch(`https://api.decolecta.com/v1/sunat/ruc?numero=${rucLimpio}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (res.status === 404) {
      return { error: 'No se encontró ese RUC.' }
    }
    if (!res.ok) {
      return { error: `No se pudo consultar el RUC (${res.status}).` }
    }

    const data = await res.json()
    const nombre =
      data.razon_social ?? data.nombre_o_razon_social ?? data.nombre ?? data.name ?? null

    if (!nombre) {
      return { error: 'La API respondió pero no trajo el nombre — revisa el formato de respuesta.' }
    }

    return { nombre }
  } catch {
    return { error: 'No se pudo conectar con el servicio de consulta de RUC.' }
  }
}
