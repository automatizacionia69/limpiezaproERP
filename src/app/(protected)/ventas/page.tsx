import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VentasTabla } from './ventas-tabla'

type OrdenRow = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  clientes: { nombre: string } | null
}

export default async function VentasPage() {
  const supabase = await createClient()
  const { data: ordenes } = await supabase
    .from('ordenes_venta')
    .select('id, numero, estado, total, creado_en, clientes(nombre)')
    .order('creado_en', { ascending: false })
    .returns<OrdenRow[]>()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">💰 Ventas</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">Órdenes de venta a clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-orange-300 hover:bg-orange-50"
          >
            Clientes
          </Link>
          <Link
            href="/ventas/nueva"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva orden
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <VentasTabla ordenes={ordenes ?? []} />
      </div>
    </div>
  )
}
