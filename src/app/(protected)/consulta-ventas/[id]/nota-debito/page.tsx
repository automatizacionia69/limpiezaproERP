import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { NotaDebitoForm } from '../nota-debito-form'

export default async function NotaDebitoNuevaPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('consulta_ventas')
  const { id } = await params
  const supabase = await createClient()

  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select('id, tipo, numero, estado, clientes(nombre)')
    .eq('id', id)
    .single()

  if (!comprobante) notFound()

  const cliente = Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes
  const tipoLabel = TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/consulta-ventas/${comprobante.id}`}
          className="text-sm font-bold text-[#64748b] hover:text-amber-600 dark:text-slate-400"
        >
          ← Volver al comprobante
        </Link>
      </div>

      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-amber-100 bg-white p-8 shadow-lg shadow-amber-500/5 dark:border-amber-900/30 dark:bg-[#141a2e]">
        <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">➕ Nota de Débito</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {tipoLabel} N° {comprobante.numero} — {cliente?.nombre ?? '—'}
        </p>

        {comprobante.estado !== 'emitido' ? (
          <p className="mt-6 rounded-xl bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#64748b] dark:bg-slate-800/60 dark:text-slate-400">
            No se puede emitir una nota de débito sobre un comprobante anulado.
          </p>
        ) : (
          <NotaDebitoForm comprobanteId={comprobante.id} />
        )}
      </div>
    </div>
  )
}
