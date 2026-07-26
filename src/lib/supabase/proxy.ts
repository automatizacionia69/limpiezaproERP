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
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    response.headers.forEach((value, key) => redirectResponse.headers.set(key, value))
    return redirectResponse
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    response.headers.forEach((value, key) => redirectResponse.headers.set(key, value))
    return redirectResponse
  }

  return response
}
