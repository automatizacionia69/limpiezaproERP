import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { EmitirComprobanteForm } from './emitir-form'

export default async function FacturarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('ventas')
  const { id } = await params
  const supabase = await createClient()

  const { data: orden } = await supabase
    .from('ordenes_venta')
    .select('id, numero, estado, total, clientes(nombre, documento)')
    .eq('id', id)
    .single()

  if (!orden) {
    notFound()
  }

  const cliente = Array.isArray(orden.clientes) ? orden.clientes[0] : orden.clientes

  if (orden.estado !== 'pendiente') {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/ventas" className="text-sm font-bold text-[#64748b] hover:text-teal-600">
          ← Volver a Ventas
        </Link>
        <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 text-center shadow-lg shadow-slate-500/5">
          <p className="text-sm font-medium text-[#64748b]">
            La orden {orden.numero} ya fue facturada o anulada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/ventas" className="text-sm font-bold text-[#64748b] hover:text-teal-600">
        ← Volver a Ventas
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-[#1e293b]">🧾 Facturar orden {orden.numero}</h1>
      <p className="mt-1 text-sm font-medium text-[#64748b]">
        Cliente: <span className="font-bold text-[#1e293b]">{cliente?.nombre ?? '—'}</span> · Total: S/{' '}
        {Number(orden.total).toFixed(2)}
      </p>

      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <EmitirComprobanteForm ordenId={orden.id} tieneRuc={(cliente?.documento ?? '').trim().length === 11} />
      </div>
    </div>
  )
}
