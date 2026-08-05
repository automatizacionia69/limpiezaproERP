'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const recordar = formData.get('recordar') === 'on'

  const supabase = await createClient({ recordar })

  let errorCode: 'credenciales-invalidas' | 'error-conexion' | null = null
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    errorCode = error ? 'credenciales-invalidas' : null
  } catch {
    // Supabase no disponible o falla de red — no confundir con credenciales
    // invalidas, que es un rechazo explicito del servidor de Auth.
    errorCode = 'error-conexion'
  }

  if (errorCode) {
    redirect(`/login?error=${errorCode}`)
  }

  // Marcador propio leído por src/lib/supabase/proxy.ts en cada request,
  // para que "no recordar" siga aplicando en los refrescos de sesión
  // posteriores (no solo en las cookies puestas por este signIn).
  const cookieStore = await cookies()
  if (recordar) {
    cookieStore.delete('sb-recordar')
  } else {
    cookieStore.set('sb-recordar', '0', { path: '/', sameSite: 'lax' })
  }

  redirect('/dashboard')
}
