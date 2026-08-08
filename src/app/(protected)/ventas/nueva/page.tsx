import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaVentaForm } from './nueva-venta-form'

export default async function NuevaVentaPage() {
  await requierePermiso('ventas')
  const supabase = await createClient()
  const [{ data: clientes }, { data: productos }] = await Promise.all([
    supabase.from('clientes').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre, cantidad, precio_venta, tipo_afectacion_igv').eq('activo', true).order('nombre'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">💰 Nueva orden de venta</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        {!clientes || clientes.length === 0 ? (
          <p className="text-sm font-medium text-[#64748b] dark:text-slate-400">
            Todavía no hay clientes — crea uno primero en Clientes.
          </p>
        ) : (
          <NuevaVentaForm clientes={clientes} productos={productos ?? []} />
        )}
      </div>
    </div>
  )
}
