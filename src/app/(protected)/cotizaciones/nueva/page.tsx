import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaCotizacionForm } from './nueva-cotizacion-form'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  precio_venta: number | null
  unidades_medida: { nombre: string } | null
}

export default async function NuevaCotizacionPage() {
  await requierePermiso('cotizaciones')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: clientes }, { data: productos }, { data: vendedores }, { data: configuracion }, { data: unidadesMedida }] =
    await Promise.all([
      supabase
        .from('clientes')
        .select('id, nombre, documento, direccion, vendedor_id, telefono, email')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('productos')
        .select('id, nombre, codigo, cantidad, precio_venta, unidades_medida(nombre)')
        .eq('activo', true)
        .order('nombre')
        .returns<ProductoRow[]>(),
      supabase.from('usuarios_perfil').select('id, nombre').order('nombre'),
      supabase
        .from('configuracion')
        .select('empresa, ruc, direccion, telefono, email, titular, yape, cuenta_bcp_soles, cci_bcp, cuenta_bbva_soles, cci_bbva')
        .eq('id', 1)
        .single(),
      supabase.from('unidades_medida').select('id, nombre').order('nombre'),
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
          unidadesMedida={unidadesMedida ?? []}
          usuarioActualId={user?.id ?? ''}
          configuracion={{
            empresa: configuracion?.empresa ?? 'Distribuidora LimpiezaPro',
            ruc: configuracion?.ruc ?? null,
            direccion: configuracion?.direccion ?? null,
            telefono: configuracion?.telefono ?? null,
            email: configuracion?.email ?? null,
            titular: configuracion?.titular ?? null,
            yape: configuracion?.yape ?? null,
            cuenta_bcp_soles: configuracion?.cuenta_bcp_soles ?? null,
            cci_bcp: configuracion?.cci_bcp ?? null,
            cuenta_bbva_soles: configuracion?.cuenta_bbva_soles ?? null,
            cci_bbva: configuracion?.cci_bbva ?? null,
          }}
        />
      )}
    </div>
  )
}
