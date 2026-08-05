import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { GuiasTabla } from './guias-tabla'

type GuiaRow = {
  id: number
  numero: string
  fecha: string
  motivo: string
  direccion_despacho: string | null
  comprobantes: { numero: string; tipo: string; clientes: { nombre: string } | null } | null
}

export default async function GuiasRemisionPage() {
  await requierePermiso('guias_remision')
  const supabase = await createClient()
  const { data: guias } = await supabase
    .from('guias_remision')
    .select('id, numero, fecha, motivo, direccion_despacho, comprobantes(numero, tipo, clientes(nombre))')
    .order('fecha', { ascending: false })
    .returns<GuiaRow[]>()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📦 Guías de Remisión</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
            Se generan automáticamente al facturar una venta, o crea una guía de traslado sin factura para
            mover mercadería entre almacenes propios.
          </p>
        </div>
        <Link
          href="/guias-remision/nueva"
          className="rounded-md bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95"
        >
          + Nueva guía de traslado
        </Link>
      </div>

      <div className="mt-6">
        <GuiasTabla guias={guias ?? []} />
      </div>
    </div>
  )
}
