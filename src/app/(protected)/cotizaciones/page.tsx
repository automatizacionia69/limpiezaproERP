import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { CotizacionesTabla } from './cotizaciones-tabla'

type CotizacionRow = {
  id: number
  numero: string
  fecha: string
  total: number
  estado: string
  clientes: { nombre: string } | null
}

export default async function CotizacionesPage() {
  await requierePermiso('cotizaciones')
  const supabase = await createClient()
  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, total, estado, clientes(nombre)')
    .order('numero', { ascending: false })
    .returns<CotizacionRow[]>()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🔎 Consulta de Cotización</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
            {cotizaciones?.length ?? 0} cotización{(cotizaciones?.length ?? 0) === 1 ? '' : 'es'} guardada{(cotizaciones?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/cotizaciones/nueva"
          className="flex items-center gap-2 rounded-md bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva cotización
        </Link>
      </div>

      <div className="mt-6">
        <CotizacionesTabla cotizaciones={cotizaciones ?? []} />
      </div>
    </div>
  )
}
