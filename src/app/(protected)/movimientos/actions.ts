'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null }

export async function registrarMovimiento(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('movimientos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const productoId = formData.get('producto_id') as string
  const tipo = formData.get('tipo') as string
  const cantidad = formData.get('cantidad') as string
  const costoUnitario = formData.get('costo_unitario') as string
  const motivo = (formData.get('motivo') as string)?.trim()

  if (!productoId) {
    return { error: 'Selecciona un producto.' }
  }
  if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
    return { error: 'Selecciona un tipo de movimiento.' }
  }
  if (cantidad === '' || Number(cantidad) < 0) {
    return { error: 'Ingresa una cantidad válida.' }
  }
  if (tipo === 'entrada' && (costoUnitario === '' || Number(costoUnitario) < 0)) {
    return { error: 'El costo unitario es obligatorio para una entrada.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('movimientos').insert({
    producto_id: Number(productoId),
    tipo,
    cantidad: Number(cantidad),
    costo_unitario: tipo === 'entrada' ? Number(costoUnitario) : null,
    usuario_id: user?.id ?? null,
    motivo: motivo || null,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/movimientos')
}
