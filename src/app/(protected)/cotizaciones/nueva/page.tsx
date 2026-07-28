import { createClient } from '@/lib/supabase/server'
import { NuevaCotizacionForm } from './nueva-cotizacion-form'

export default async function NuevaCotizacionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: clientes }, { data: productos }, { data: vendedores }] = await Promise.all([
    supabase.from('clientes').select('id, nombre, documento').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre, precio_venta').order('nombre'),
    supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b]">📝 Nueva cotización</h1>
      {!clientes || clientes.length === 0 ? (
        <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
          <p className="text-sm font-medium text-[#64748b]">
            Todavía no hay clientes — crea uno primero en Clientes.
          </p>
        </div>
      ) : (
        <NuevaCotizacionForm
          clientes={clientes}
          productos={productos ?? []}
          vendedores={vendedores ?? []}
          usuarioActualId={user?.id ?? ''}
        />
      )}
    </div>
  )
}
