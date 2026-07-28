import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios_perfil')
    .select('id')
    .eq('id', user.id)
    .single()

  // Nota: `signOut()` sí revoca la sesión en el servidor de Supabase aunque
  // la cookie local no se pueda escribir desde aquí (ver detalle histórico
  // en el spec de login) — `getUser()` revalida en cada request, así que la
  // siguiente navegación ya detecta la sesión revocada.
  if (perfilError && perfilError.code !== 'PGRST116') {
    await supabase.auth.signOut()
    redirect('/login?error=error-perfil')
  }

  if (!perfil) {
    await supabase.auth.signOut()
    redirect('/login?error=sin-perfil')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="flex items-center justify-between bg-blue-950 px-6 py-4 text-white">
        <div className="flex items-center gap-6">
          <span className="font-semibold">LimpiezaPro</span>
          <Link href="/dashboard" className="text-sm text-blue-100 hover:text-white">
            Dashboard
          </Link>
          <Link href="/productos" className="text-sm text-blue-100 hover:text-white">
            Productos
          </Link>
          <Link href="/movimientos" className="text-sm text-blue-100 hover:text-white">
            Movimientos
          </Link>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            Salir
          </button>
        </form>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
