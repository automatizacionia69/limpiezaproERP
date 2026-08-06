'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { esAdmin } from '@/lib/permisos'

export type EstadoFormulario = { error: string | null; ok?: boolean }
export type EstadoLogo = { error: string | null; ok?: boolean }

const TIPOS_LOGO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_BYTES_LOGO = 2 * 1024 * 1024

export async function subirLogo(_prevState: EstadoLogo, formData: FormData): Promise<EstadoLogo> {
  if (!(await esAdmin())) {
    return { error: 'Solo un administrador puede cambiar el logo.' }
  }

  const archivo = formData.get('logo')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: 'Selecciona una imagen.' }
  }
  if (!TIPOS_LOGO_PERMITIDOS.includes(archivo.type)) {
    return { error: 'Formato no soportado. Usa PNG, JPG, SVG o WebP.' }
  }
  if (archivo.size > MAX_BYTES_LOGO) {
    return { error: 'La imagen no debe superar 2MB.' }
  }

  const supabase = await createClient()
  // Ruta fija ('empresa-logo', ver src/lib/logo.ts) con upsert: cada subida
  // pisa el archivo anterior en vez de acumular huérfanos en el bucket.
  const { error } = await supabase.storage.from('branding').upload('empresa-logo', archivo, {
    upsert: true,
    contentType: archivo.type,
    cacheControl: '300',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return { error: null, ok: true }
}

export async function actualizarConfiguracion(
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  if (!(await esAdmin())) {
    return { error: 'Solo un administrador puede editar la configuración.' }
  }

  const empresa = (formData.get('empresa') as string)?.trim()
  const ruc = (formData.get('ruc') as string)?.trim()
  const direccion = (formData.get('direccion') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const moneda = (formData.get('moneda') as string)?.trim()
  const titular = (formData.get('titular') as string)?.trim()
  const yape = (formData.get('yape') as string)?.trim()
  const cuentaBcpSoles = (formData.get('cuenta_bcp_soles') as string)?.trim()
  const cciBcp = (formData.get('cci_bcp') as string)?.trim()
  const cuentaBbvaSoles = (formData.get('cuenta_bbva_soles') as string)?.trim()
  const cciBbva = (formData.get('cci_bbva') as string)?.trim()
  const usaLoteVencimiento = formData.get('usa_lote_vencimiento') === 'true'

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
      titular: titular || null,
      yape: yape || null,
      cuenta_bcp_soles: cuentaBcpSoles || null,
      cci_bcp: cciBcp || null,
      cuenta_bbva_soles: cuentaBbvaSoles || null,
      cci_bbva: cciBbva || null,
      usa_lote_vencimiento: usaLoteVencimiento,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/cotizaciones')
  revalidatePath('/reportes')
  revalidatePath('/movimientos/entradas')
  return { error: null, ok: true }
}
