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

  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios_perfil')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  // Nota sobre los dos `signOut()` de abajo: al llamarse directo en el cuerpo
  // de este Server Component (no como una Server Action real vía <form>),
  // Next.js no permite escribir la cookie de sesión, así que la cookie local
  // queda vieja. Esto no es un hueco de seguridad: `signOut()` sí revoca la
  // sesión en el servidor de Supabase (llamada HTTP independiente de la
  // restricción de cookies de Next.js), y `getUser()` revalida contra ese
  // servidor en cada request, así que la siguiente navegación ya detecta la
  // sesión revocada y redirige a /login. No hay ventana real de uso indebido.
  if (perfilError && perfilError.code !== 'PGRST116') {
    await supabase.auth.signOut()
    redirect('/login?error=error-perfil')
  }

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
