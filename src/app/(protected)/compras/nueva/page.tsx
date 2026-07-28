import { createClient } from '@/lib/supabase/server'
import { NuevaCompraForm } from './nueva-compra-form'

export default async function NuevaCompraPage() {
  const supabase = await createClient()
  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre').order('nombre'),
  ])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">🛒 Nueva orden de compra</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        {!proveedores || proveedores.length === 0 ? (
          <p className="text-sm font-medium text-[#64748b]">
            Todavía no hay proveedores — crea uno primero en Proveedores.
          </p>
        ) : (
          <NuevaCompraForm proveedores={proveedores} productos={productos ?? []} />
        )}
      </div>
    </div>
  )
}
