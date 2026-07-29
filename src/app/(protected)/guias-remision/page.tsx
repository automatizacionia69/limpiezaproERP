import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { GuiasTabla } from './guias-tabla'

type GuiaRow = {
  id: number
  numero: string
  fecha: string
  direccion_despacho: string | null
  comprobantes: { numero: string; tipo: string; clientes: { nombre: string } | null } | null
}

export default async function GuiasRemisionPage() {
  await requierePermiso('guias_remision')
  const supabase = await createClient()
  const { data: guias } = await supabase
    .from('guias_remision')
    .select('id, numero, fecha, direccion_despacho, comprobantes(numero, tipo, clientes(nombre))')
    .order('fecha', { ascending: false })
    .returns<GuiaRow[]>()

  return (
    <div>
      <div>
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📦 Guías de Remisión</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          Se generan automáticamente al facturar una venta — edita la dirección de despacho, fecha o número si
          hace falta.
        </p>
      </div>

      <div className="mt-6">
        <GuiasTabla guias={guias ?? []} />
      </div>
    </div>
  )
}
