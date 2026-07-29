import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaCotizacionForm } from './nueva-cotizacion-form'

export default async function NuevaCotizacionPage() {
  await requierePermiso('cotizaciones')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: clientes }, { data: productos }, { data: vendedores }, { data: configuracion }] =
    await Promise.all([
      supabase.from('clientes').select('id, nombre, documento, vendedor_id').eq('activo', true).order('nombre'),
      supabase.from('productos').select('id, nombre, cantidad, precio_venta').order('nombre'),
      supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
      supabase.from('configuracion').select('empresa').eq('id', 1).single(),
    ])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📝 Nueva cotización</h1>
      {!clientes || clientes.length === 0 ? (
        <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
          <p className="text-sm font-medium text-[#64748b] dark:text-slate-400">
            Todavía no hay clientes — crea uno primero en Clientes.
          </p>
        </div>
      ) : (
        <NuevaCotizacionForm
          clientes={clientes}
          productos={productos ?? []}
          vendedores={vendedores ?? []}
          usuarioActualId={user?.id ?? ''}
          empresa={configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
        />
      )}
    </div>
  )
}
