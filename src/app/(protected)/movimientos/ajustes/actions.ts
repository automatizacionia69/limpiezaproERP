'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'
import { fechaDocumentoFueraDeRango } from '@/lib/fecha'

export type EstadoFormulario = { error: string | null }

type ItemAjuste = {
  producto_id: number
  cantidad: number
}

export async function crearAjuste(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await tienePermiso('movimientos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const fecha = formData.get('fecha') as string
  const motivo = formData.get('motivo') as string
  const motivoOtro = (formData.get('motivo_otro') as string)?.trim()
  const observaciones = (formData.get('observaciones') as string)?.trim()
  const itemsRaw = formData.get('items') as string

  if (!fecha) {
    return { error: 'La fecha del ajuste es obligatoria.' }
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

  let items: ItemAjuste[]
  try {
    items = JSON.parse(itemsRaw || '[]')
  } catch {
    return { error: 'Los ítems del ajuste no son válidos.' }
  }

  items = items.filter((it) => it.producto_id && it.cantidad >= 0)
  if (items.length === 0) {
    return { error: 'Agrega al menos un ítem al ajuste.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: cabecera, error: errorCabecera } = await supabase
    .from('ajustes_cabecera')
    .insert({
      fecha,
      usuario_id: user?.id ?? null,
      motivo,
      motivo_otro: motivo === 'otro' ? motivoOtro : null,
      observaciones: observaciones || null,
    })
    .select('id, numero')
    .single()

  if (errorCabecera || !cabecera) {
    return { error: errorCabecera?.message ?? 'No se pudo crear el ajuste.' }
  }

  // cantidad = conteo físico real (valor absoluto), no una diferencia — el
  // trigger aplicar_movimiento() calcula el delta y autocompleta el costo.
  const { error: errorMovs } = await supabase.from('movimientos').insert(
    items.map((it) => ({
      producto_id: it.producto_id,
      tipo: 'ajuste',
      cantidad: it.cantidad,
      usuario_id: user?.id ?? null,
      motivo: motivo === 'otro' ? motivoOtro : motivo,
      referencia: cabecera.numero,
      ajuste_cabecera_id: cabecera.id,
    }))
  )

  if (errorMovs) {
    // La cabecera queda huérfana si esto falla — no se puede "deshacer" el
    // insert (no hay política de delete, a propósito).
    return { error: errorMovs.message }
  }

  revalidatePath('/movimientos/ajustes')
  revalidatePath('/productos')
  revalidatePath('/movimientos')
  revalidatePath('/dashboard')
  redirect('/movimientos/ajustes')
}

export type ItemDetalleAjuste = {
  id: number
  cantidad: number
  efecto_cantidad: number
  costo_unitario: number | null
  producto_nombre: string | null
  producto_codigo: string | null
}

export type DetalleAjuste = {
  id: number
  numero: string
  fecha: string
  motivo: string
  motivo_otro: string | null
  observaciones: string | null
  estado: string
  creado_en: string
  usuario_nombre: string | null
  items: ItemDetalleAjuste[]
}

/** Detalle de un ajuste para el popup "Ver" de la tabla — misma consulta que antes vivía en /movimientos/ajustes/[id]. */
export async function obtenerDetalleAjuste(id: number): Promise<{ detalle: DetalleAjuste } | { error: string }> {
  if (!(await tienePermiso('movimientos'))) {
    return { error: 'No tienes permiso para esta acción.' }
  }

  const supabase = await createClient()

  type CabeceraRaw = {
    id: number
    numero: string
    fecha: string
    motivo: string
    motivo_otro: string | null
    observaciones: string | null
    estado: string
    creado_en: string
    usuarios_perfil: { nombre: string } | { nombre: string }[] | null
  }
  type ItemRaw = {
    id: number
    cantidad: number
    efecto_cantidad: number
    costo_unitario: number | null
    productos: { nombre: string; codigo: string | null } | { nombre: string; codigo: string | null }[] | null
  }

  const [{ data: cabecera }, { data: items }] = await Promise.all([
    supabase
      .from('ajustes_cabecera')
      .select('id, numero, fecha, motivo, motivo_otro, observaciones, estado, creado_en, usuarios_perfil(nombre)')
      .eq('id', id)
      .maybeSingle<CabeceraRaw>(),
    supabase
      .from('movimientos')
      .select('id, cantidad, efecto_cantidad, costo_unitario, productos(nombre, codigo)')
      .eq('ajuste_cabecera_id', id)
      .order('id')
      .returns<ItemRaw[]>(),
  ])

  if (!cabecera) {
    return { error: 'No se encontró el ajuste.' }
  }

  const usuario = Array.isArray(cabecera.usuarios_perfil) ? cabecera.usuarios_perfil[0] : cabecera.usuarios_perfil

  return {
    detalle: {
      id: cabecera.id,
      numero: cabecera.numero,
      fecha: cabecera.fecha,
      motivo: cabecera.motivo,
      motivo_otro: cabecera.motivo_otro,
      observaciones: cabecera.observaciones,
      estado: cabecera.estado,
      creado_en: cabecera.creado_en,
      usuario_nombre: usuario?.nombre ?? null,
      items: (items ?? []).map((it) => {
        const producto = Array.isArray(it.productos) ? it.productos[0] : it.productos
        return {
          id: it.id,
          cantidad: it.cantidad,
          efecto_cantidad: it.efecto_cantidad,
          costo_unitario: it.costo_unitario,
          producto_nombre: producto?.nombre ?? null,
          producto_codigo: producto?.codigo ?? null,
        }
      }),
    },
  }
}
