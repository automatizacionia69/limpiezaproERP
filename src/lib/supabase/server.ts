import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(opciones?: { recordar?: boolean }) {
  const cookieStore = await cookies()
  const recordar = opciones?.recordar ?? true

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // Si el usuario no marcó "Recordarme", la cookie de sesión no
              // lleva duración propia: el navegador la borra al cerrarse.
              cookieStore.set(
                name,
                value,
                recordar ? options : { ...options, maxAge: undefined, expires: undefined }
              )
            )
          } catch {
            // Se llamó desde un Server Component (sin permiso de escritura
            // de cookies). No pasa nada: src/proxy.ts refresca la sesión
            // en cada request y sí puede escribir cookies.
          }
        },
      },
    }
  )
}
