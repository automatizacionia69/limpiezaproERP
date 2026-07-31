'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tienePermiso } from '@/lib/permisos'

export async function marcarCobrada(id: number) {
  if (!(await tienePermiso('cobranzas'))) {
    throw new Error('No tienes permiso para esta acción.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('comprobantes')
    .update({ fecha_cobro: new Date().toISOString() })
    .eq('id', id)
    .is('fecha_cobro', null)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/cobranzas')
  revalidatePath('/dashboard')
}
