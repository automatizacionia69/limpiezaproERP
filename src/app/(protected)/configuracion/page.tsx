import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from './configuracion-form'

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: configuracion }, { data: perfil }] = await Promise.all([
    supabase
      .from('configuracion')
      .select('empresa, ruc, direccion, telefono, email, moneda')
      .eq('id', 1)
      .single(),
    user
      ? supabase.from('usuarios_perfil').select('rol').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const puedeEditar = perfil?.rol === 'admin'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">⚙️ Configuración</h1>
      <p className="mt-1 text-sm font-medium text-[#64748b]">
        Estos datos aparecen en las cotizaciones y reportes exportados.
      </p>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <ConfiguracionForm
          configuracion={
            configuracion ?? {
              empresa: 'Distribuidora LimpiezaPro',
              ruc: null,
              direccion: null,
              telefono: null,
              email: null,
              moneda: 'S/',
            }
          }
          puedeEditar={puedeEditar}
        />
      </div>
    </div>
  )
}
