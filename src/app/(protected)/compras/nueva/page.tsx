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
      <h1 className="text-xl font-semibold text-[#1e293b]">Nueva orden de compra</h1>
      <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        {!proveedores || proveedores.length === 0 ? (
          <p className="text-sm text-[#64748b]">
            Todavía no hay proveedores — crea uno primero en Proveedores.
          </p>
        ) : (
          <NuevaCompraForm proveedores={proveedores} productos={productos ?? []} />
        )}
      </div>
    </div>
  )
}
