import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'
import { Sidebar } from './sidebar'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

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
    .select('nombre, rol')
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
    <div className="min-h-screen bg-[#f4f6fa]">
      <Sidebar />

      <div className="pl-64">
        <header className="flex h-16 items-center justify-between border-b border-[#e8ebf1] bg-white px-6">
          <div className="text-sm font-semibold text-[#2b303a]" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e07a5f] text-sm font-semibold text-white">
              {iniciales(perfil.nombre)}
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-semibold leading-tight text-[#2b303a]">
                {perfil.nombre}
              </div>
              <div className="text-[11px] leading-tight text-[#7a8290]">
                {ROLE_LABELS[perfil.rol] ?? perfil.rol}
              </div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#7a8290] transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H3"
                  />
                </svg>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
