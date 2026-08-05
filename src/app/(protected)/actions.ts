'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('sb-recordar')
  redirect('/login')
}

/** Estado "leída" compartido para todo el equipo — ver notificaciones en lib/notificaciones.ts. */
export async function marcarNotificacionLeida(id: number) {
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida_en: new Date().toISOString() }).eq('id', id)
}

export async function marcarTodasNotificacionesLeidas() {
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida_en: new Date().toISOString() }).is('leida_en', null)
}
