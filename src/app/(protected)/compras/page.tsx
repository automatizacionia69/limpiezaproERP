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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1e293b]">Compras</h1>
          <p className="mt-0.5 text-[13px] text-[#64748b]">Órdenes de compra a proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/proveedores"
            className="rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#1e293b] hover:bg-[#f8fafc]"
          >
            Proveedores
          </Link>
          <Link
            href="/compras/nueva"
            className="flex items-center gap-1.5 rounded-full bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4338ca]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva orden
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <ComprasTabla ordenes={ordenes ?? []} />
      </div>
    </div>
  )
}
