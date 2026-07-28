'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EstadoFormulario = { error: string | null; ok?: boolean }

export async function actualizarConfiguracion(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const empresa = (formData.get('empresa') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const moneda = (formData.get('moneda') as string)?.trim()

  if (!empresa) {
    return { error: 'El nombre de la empresa es obligatorio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('configuracion')
    .update({
      empresa,
      ruc: ruc || null,
      direccion: direccion || null,
      telefono: telefono || null,
      email: email || null,
      moneda: moneda || 'S/',
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/cotizaciones')
  revalidatePath('/reportes')
  return { error: null, ok: true }
}
