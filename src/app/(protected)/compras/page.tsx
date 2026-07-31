import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { ComprasTabla } from './compras-tabla'

type OrdenRow = {
  id: number
  numero: string
  estado: string
  total: number
  creado_en: string
  fecha_registro: string
  tipo_documento: string
  documento_serie: string | null
  documento_numero: string | null
  proveedores: { nombre: string } | null
}

export default async function ComprasPage() {
  await requierePermiso('compras')
  const supabase = await createClient()
  const { data: ordenes } = await supabase
    .from('ordenes_compra')
    .select(
      'id, numero, estado, total, creado_en, fecha_registro, tipo_documento, documento_serie, documento_numero, proveedores(nombre)'
    )
    .order('creado_en', { ascending: false })
    .returns<OrdenRow[]>()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">🛒 Compras</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">Órdenes de compra a proveedores</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/proveedores"
            className="rounded-md border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-5 py-3 text-sm font-bold text-[#1e293b] dark:text-slate-100 transition-all hover:border-cyan-300 hover:bg-cyan-50"
          >
            Proveedores
          </Link>
          <Link
            href="/compras/nueva"
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all"
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
