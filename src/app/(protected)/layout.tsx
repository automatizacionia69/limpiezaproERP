import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerModulosPermitidos } from '@/lib/permisos'
import { obtenerCobranzas, filtrarParaCampana } from '@/lib/cobranzas'
import { obtenerNotificaciones } from '@/lib/notificaciones'
import { signOut } from './actions'
import { AppShell } from './app-shell'

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

  const modulosPermitidos = await obtenerModulosPermitidos(user.id, perfil.rol)

  const { data: stockBajo } = await supabase
    .from('productos_stock_bajo')
    .select('id, nombre, cantidad, punto_reorden')
    .order('nombre')

  const cobranzas = filtrarParaCampana(await obtenerCobranzas())

  // Campana de pedidos del chatbot: solo admin/ventas (decisión del dueño —
  // almacén no gestiona pedidos/cotizaciones). La RLS de "notificaciones" ya
  // lo exige igual, esto solo evita la consulta y el render para quien no la ve.
  const puedeVerPedidos = perfil.rol === 'admin' || perfil.rol === 'ventas'
  const notificacionesPedidos = puedeVerPedidos ? await obtenerNotificaciones() : []

  return (
    <AppShell
      nombre={perfil.nombre}
      rol={perfil.rol}
      modulosPermitidos={[...modulosPermitidos]}
      stockBajo={stockBajo ?? []}
      cobranzas={cobranzas}
      notificacionesPedidos={notificacionesPedidos}
      puedeVerPedidos={puedeVerPedidos}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  )
}
