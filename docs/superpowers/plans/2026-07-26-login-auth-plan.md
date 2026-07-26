# Login con Supabase Auth — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un login funcional con Supabase Auth que protege todas las rutas del ERP, muestra el nombre y rol del usuario en una pantalla `/dashboard` placeholder, y maneja los tres casos de error definidos en el spec.

**Architecture:** Next.js App Router + `@supabase/ssr` con sesión en cookies httpOnly. Un archivo `proxy.ts` (Next.js 16) centraliza la protección de rutas. El login usa un Server Action con `<form action={...}>` — sin JavaScript de cliente. Los errores se comunican vía `?error=<código>` en la URL de `/login`, que la página traduce a un mensaje en español.

**Tech Stack:** Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, TypeScript, Tailwind CSS v4, `@supabase/ssr` ^0.12.3, `@supabase/supabase-js` ^2.110.8.

## Global Constraints

- Todo el texto de la interfaz en español.
- Sin registro público de usuarios — las cuentas se crean manualmente en el dashboard de Supabase (fuera de esta app).
- Sin flujo de recuperación de contraseña en este ciclo.
- Sin tests automatizados en este ciclo (decisión explícita del usuario) — cada tarea se verifica manualmente con `curl`/navegador en vez de un test runner.
- **Next.js 16 renombró `middleware.ts` a `proxy.ts`**: el archivo se llama `src/proxy.ts` y exporta una función `proxy()` (no `middleware()`). Confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **`@supabase/ssr` requiere `getAll`/`setAll`** para las cookies del cliente de servidor — los métodos `get`/`set`/`remove` están deprecados y no se usan en este plan. Confirmado en `node_modules/@supabase/ssr/dist/main/types.d.ts`.
- El `setAll` de `@supabase/ssr` recibe `(cookiesToSet, headers)` — el segundo argumento (`headers`) debe aplicarse a la respuesta también (son los headers de `Cache-Control` que evitan que un CDN cachee una sesión de otro usuario).
- Diseño visual: tarjeta glassmorphism (`bg-white/10 backdrop-blur-xl border border-white/20`) sobre fondo con gradiente azul marino (`bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950` — Tailwind v4 usa `bg-linear-to-*`, no `bg-gradient-to-*`). Sin "remember me" ni "forgot password".
- Mensajes de error genéricos: nunca especificar si falló el email o la contraseña.
- Sin emojis en el código ni en la UI.

---

### Task 1: Helpers de Supabase para SSR

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Interfaces:**
- Produces: `createClient()` (síncrono) desde `client.ts`, para usarse en Client Components. Retorna `SupabaseClient`. Ninguna tarea de este plan lo consume todavía (el login no tiene Client Components) — queda listo para el próximo ciclo (CRUD de productos), tal como lo especifica el diseño aprobado.
- Produces: `createClient()` (async) desde `server.ts`, para usarse en Server Components y Server Actions. Retorna `Promise<SupabaseClient>`. Consumido por las Tareas 3 y 4.
- Consumes: `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya configuradas en `.env.local`).

- [ ] **Step 1: Crear el cliente de navegador**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Crear el cliente de servidor**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

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
              cookieStore.set(name, value, options)
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
```

- [ ] **Step 3: Verificar que compila sin errores de tipos**

Run: `npx tsc --noEmit`
Expected: sin salida (exit code 0). Si aparece un error sobre variables de entorno posiblemente `undefined`, confirma que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya deberían estar, se configuraron antes de este plan).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/server.ts
git commit -m "feat: agregar helpers de Supabase para SSR (cliente y servidor)"
```

---

### Task 2: Proxy de sesión y protección de rutas

**Files:**
- Create: `src/lib/supabase/proxy.ts`
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores (usa `createServerClient` directo, no el helper de Task 1, porque el proxy necesita leer/escribir cookies de `NextRequest`/`NextResponse`, no de `next/headers`).
- Produces: `updateSession(request: NextRequest): Promise<NextResponse>` desde `src/lib/supabase/proxy.ts`, usada por `src/proxy.ts`.

Reglas de redirección:
- Sin sesión y la ruta no es `/login` → redirige a `/login`.
- Con sesión y la ruta es `/login` o `/` → redirige a `/dashboard`.
- En cualquier otro caso, deja pasar la request.

- [ ] **Step 1: Crear el helper `updateSession`**

```ts
// src/lib/supabase/proxy.ts
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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
```

- [ ] **Step 2: Crear el proxy raíz**

```ts
// src/proxy.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Verificar la redirección de no-autenticado**

Con el servidor de desarrollo corriendo (`npm run dev`), en otra terminal:

Run: `curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/`
Expected: `307 -> http://localhost:3000/login` (aunque `/login` todavía no exista como página — el proxy redirige antes de que Next.js resuelva la ruta destino; eso se verifica en la Tarea 3).

Run: `curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/dashboard`
Expected: `307 -> http://localhost:3000/login`

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/proxy.ts src/proxy.ts
git commit -m "feat: agregar proxy de sesion para proteger rutas"
```

---

### Task 3: Página de login

**Files:**
- Create: `src/app/login/actions.ts`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient()` async desde `src/lib/supabase/server.ts` (Task 1).
- Produces: Server Action `signIn(formData: FormData): Promise<void>` desde `actions.ts`, usada por `login-form.tsx`.
- Produces: componente `LoginForm({ errorMessage }: { errorMessage?: string })` desde `login-form.tsx`, usado por `page.tsx`.

Códigos de error en la URL (`/login?error=<código>`) y su mensaje:
- `credenciales-invalidas` → "Correo o contraseña incorrectos."
- `error-conexion` → "No se pudo conectar, intenta de nuevo."
- `sin-perfil` → "Tu cuenta no tiene un perfil asignado, contacta al administrador." (se usa en la Tarea 4)

- [ ] **Step 1: Crear el Server Action de sign-in**

```ts
// src/app/login/actions.ts
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
```

- [ ] **Step 2: Crear el formulario visual (glassmorphism azul marino)**

```tsx
// src/app/login/login-form.tsx
import { signIn } from './actions'

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-10 w-10 text-blue-100"
          aria-hidden="true"
        >
          <path d="M12 12c2.71 0 4.9-2.19 4.9-4.9S14.71 2.2 12 2.2 7.1 4.39 7.1 7.1 9.29 12 12 12Zm0 2.45c-3.65 0-9.8 1.83-9.8 5.48v2.87h19.6v-2.87c0-3.65-6.15-5.48-9.8-5.48Z" />
        </svg>
      </div>

      <h1 className="mb-6 text-center text-lg font-semibold text-white">
        Distribuidora LimpiezaPro
      </h1>

      <form action={signIn} className="space-y-5">
        <div className="flex items-center gap-3 border-b border-white/30 pb-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-blue-100"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0-.41.34-.75.75-.75h18c.41 0 .75.34.75.75v10.5a.75.75 0 0 1-.75.75h-18a.75.75 0 0 1-.75-.75V6.75Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
          </svg>
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            required
            className="w-full bg-transparent text-white placeholder-white/60 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-white/30 pb-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-blue-100"
            aria-hidden="true"
          >
            <rect x="4.5" y="10.5" width="15" height="9" rx="1.5" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10.5V7a4 4 0 1 1 8 0v3.5"
            />
          </svg>
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            className="w-full bg-transparent text-white placeholder-white/60 outline-none"
          />
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-blue-700 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Crear la página de login**

```tsx
// src/app/login/page.tsx
import { LoginForm } from './login-form'

const ERROR_MESSAGES: Record<string, string> = {
  'credenciales-invalidas': 'Correo o contraseña incorrectos.',
  'error-conexion': 'No se pudo conectar, intenta de nuevo.',
  'sin-perfil':
    'Tu cuenta no tiene un perfil asignado, contacta al administrador.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 p-4">
      <LoginForm errorMessage={errorMessage} />
    </main>
  )
}
```

- [ ] **Step 4: Verificar visualmente en el navegador**

Con `npm run dev` corriendo, abre `http://localhost:3000/login` (ruta exenta de la redirección del proxy). Verifica:
- Se ve la tarjeta glassmorphism sobre el fondo azul marino, con avatar, campo de correo, campo de contraseña y botón "Iniciar sesión".
- Escribe un correo/contraseña que no existan en Supabase y da submit → redirige a `/login?error=credenciales-invalidas` y se ve el mensaje "Correo o contraseña incorrectos." en rojo debajo de los campos.
- (El login con credenciales correctas todavía redirigirá a `/dashboard`, que da 404 hasta la Tarea 4 — es esperado.)

- [ ] **Step 5: Commit**

```bash
git add src/app/login/
git commit -m "feat: agregar pagina de login con formulario y server action"
```

---

### Task 4: Dashboard placeholder y cierre de sesión

**Files:**
- Create: `src/app/dashboard/actions.ts`
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` async desde `src/lib/supabase/server.ts` (Task 1).
- Produces: Server Action `signOut(): Promise<void>` desde `actions.ts`, usada por `page.tsx`.

- [ ] **Step 1: Crear el Server Action de sign-out**

```ts
// src/app/dashboard/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Crear la página de dashboard**

```tsx
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('usuarios_perfil')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    await supabase.auth.signOut()
    redirect('/login?error=sin-perfil')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 p-4 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-sm text-blue-100">Hola,</p>
        <h1 className="mt-1 text-2xl font-semibold">{perfil.nombre}</h1>
        <p className="mt-2 text-sm text-blue-100">
          Rol: {ROLE_LABELS[perfil.rol] ?? perfil.rol}
        </p>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-full bg-white/10 py-3 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verificación manual end-to-end**

Antes de probar, crea (si no lo has hecho) un usuario de prueba real:
1. Supabase Dashboard → Authentication → Add user (email + contraseña).
2. Supabase Dashboard → Table Editor → `usuarios_perfil` → Insert row, con `id` = el UUID del usuario creado, `nombre` = tu nombre de prueba, `rol` = `admin`.

Con `npm run dev` corriendo:
- Abre `http://localhost:3000/` sin sesión → redirige a `/login`.
- Ingresa el email/contraseña del usuario de prueba → redirige a `/dashboard`, muestra "Hola, {nombre}" y "Rol: Administrador".
- Da clic en "Cerrar sesión" → vuelve a `/login`.
- Intenta abrir `http://localhost:3000/dashboard` directamente sin sesión → redirige a `/login`.
- Con sesión activa, intenta abrir `http://localhost:3000/login` → redirige a `/dashboard`.
- (Opcional, para probar el caso `sin-perfil`): crea otro usuario en Supabase Auth sin insertar su fila en `usuarios_perfil`, inicia sesión con él → debe cerrar la sesión automáticamente y mostrar "Tu cuenta no tiene un perfil asignado, contacta al administrador." en `/login`.

- [ ] **Step 4: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores de TypeScript ni de ESLint (warnings menores son aceptables).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/
git commit -m "feat: agregar dashboard placeholder con datos de perfil y logout"
```

---

## Nota fuera de alcance (para después de este plan)

La política RLS `"lectura propio perfil"` en `schema.sql` (línea 101) usa `auth.role() = 'authenticated'`, lo que en realidad permite a **cualquier** usuario autenticado leer **todas** las filas de `usuarios_perfil` (no solo la propia, a pesar del nombre de la política). Para 7 usuarios internos el impacto es bajo, pero vale la pena ajustarla más adelante a `auth.uid() = id` si se quiere que cada quien solo pueda leer su propio perfil. No se incluye en este plan porque implica modificar `schema.sql`, fuera del alcance acordado (solo login).
