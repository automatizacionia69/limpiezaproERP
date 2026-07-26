import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname !== '/login') {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    return carryOverSession(response, redirectResponse)
  }

  // Si el usuario llega a /login con un parámetro de error (por ejemplo,
  // tras un signOut() tras detectar un perfil inválido), no lo redirigimos
  // de vuelta a /dashboard aunque getUser() todavía reconozca su sesión.
  // Esto evita un bucle de redirecciones si el signOut() aún no invalidó
  // el JWT desde el punto de vista del proxy.
  const hasLoginError = pathname === '/login' && request.nextUrl.searchParams.has('error')

  if (user && (pathname === '/login' || pathname === '/') && !hasLoginError) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    return carryOverSession(response, redirectResponse)
  }

  return response
}

// Copia las cookies y los headers relevantes (Cache-Control, Expires, Pragma,
// etc.) de la respuesta original a la respuesta de redirección, sin tocar
// 'set-cookie' (las cookies ya se copian explícitamente arriba mediante
// cookies.getAll()/cookies.set(), y volver a copiar el header crudo puede
// romper el 'Set-Cookie' fragmentado — ver commit 1a3e8c1).
function carryOverSession(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie))
  from.headers.forEach((value, key) => {
    if (key !== 'set-cookie') to.headers.set(key, value)
  })
  return to
}
