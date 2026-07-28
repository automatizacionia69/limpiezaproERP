import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ComprasTabla } from './compras-tabla'

type OrdenRow = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  proveedores: { nombre: string } | null
}

export default async function ComprasPage() {
  const supabase = await createClient()
  const { data: ordenes } = await supabase
    .from('ordenes_compra')
    .select('id, numero, estado, total, creado_en, proveedores(nombre)')
    .order('creado_en', { ascending: false })
    .returns<OrdenRow[]>()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b]">🛒 Compras</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">Órdenes de compra a proveedores</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/proveedores"
            className="rounded-2xl border-2 border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-[#1e293b] transition-all hover:border-cyan-300 hover:bg-cyan-50"
          >
            Proveedores
          </Link>
          <Link
            href="/compras/nueva"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva orden
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ComprasTabla ordenes={ordenes ?? []} />
      </div>
    </div>
  )
}
