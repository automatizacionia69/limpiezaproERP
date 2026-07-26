'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

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

  redirect('/dashboard')
}
