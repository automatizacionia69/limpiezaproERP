import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { NuevaGuiaTrasladoForm } from './nueva-guia-form'

export default async function NuevaGuiaTrasladoPage() {
  await requierePermiso('guias_remision')
  const supabase = await createClient()

  const { data: productos } = await supabase.from('productos').select('id, nombre, cantidad').order('nombre')

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📦 Nueva guía de traslado</h1>
      <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
        Para mover mercadería entre almacenes propios sin que exista una venta — no genera comprobante ni
        afecta el stock total.
      </p>

      <NuevaGuiaTrasladoForm productos={productos ?? []} />
    </div>
  )
}
