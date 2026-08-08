'use server'

import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type ProveedorCreado = { id: number; nombre: string }
export type ResultadoCrearProveedor = { proveedor: ProveedorCreado } | { error: string }

export type DatosProveedorRapido = {
  nombre: string
  ruc: string
  contacto: string
  telefono: string
  email: string
  direccion: string
}

/**
 * Alta rápida de proveedor desde "Nueva orden de compra" — mismos campos y
 * mismo destino (tabla `proveedores`) que Proveedores → Nuevo
 * (`crearProveedor` en proveedores/actions.ts), pero sin `redirect()`: la
 * compra en curso no se pierde. No hay UNIQUE en `ruc` a nivel de base de
 * datos (proveedores/actions.ts tampoco lo valida), así que no se inventa
 * aquí una regla de duplicidad que el resto del sistema no tiene.
 */
export async function crearProveedorDesdeCompra(datos: DatosProveedorRapido): Promise<ResultadoCrearProveedor> {
  if (!(await tienePermiso('compras'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const nombre = datos.nombre.trim()
  if (!nombre) {
    return { error: 'La razón social es obligatoria.' }
  }

  const supabase = await createClient()

  const { data: proveedor, error } = await supabase
    .from('proveedores')
    .insert({
      nombre,
      ruc: datos.ruc.trim() || null,
      contacto: datos.contacto.trim() || null,
      telefono: datos.telefono.trim() || null,
      email: datos.email.trim() || null,
      direccion: datos.direccion.trim() || null,
    })
    .select('id, nombre')
    .single()

  if (error || !proveedor) {
    return { error: error?.message ?? 'No se pudo crear el proveedor.' }
  }

  return { proveedor }
}
