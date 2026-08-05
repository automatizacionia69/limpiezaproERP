import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { obtenerDatosParaAnular } from '@/lib/comprobante-anulacion'
import { MOTIVOS_NOTA_CREDITO, TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { AnularComprobanteForm } from '../anular-form'

const MOTIVOS_PARCIALES = MOTIVOS_NOTA_CREDITO.filter((m) => !m.anula)

export default async function NotaCreditoPage({ params }: { params: Promise<{ id: string }> }) {
  await requierePermiso('consulta_ventas')
  const { id } = await params
  const supabase = await createClient()

  const datos = await obtenerDatosParaAnular(supabase, id)
  if (!datos) notFound()
  const { comprobante, cliente, saldoActual, lineasParaAnular } = datos

  const tipoLabel = TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/consulta-ventas/${comprobante.id}`}
          className="text-sm font-bold text-[#64748b] hover:text-red-600 dark:text-slate-400"
        >
          ← Volver al comprobante
        </Link>
      </div>

      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-red-100 bg-white p-8 shadow-lg shadow-red-500/5 dark:border-red-900/30 dark:bg-[#141a2e]">
        <h1 className="text-xl font-extrabold text-[#1e293b] dark:text-slate-100">🧾 Nota de Crédito</h1>
        <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {tipoLabel} N° {comprobante.numero} — {cliente?.nombre ?? '—'}
        </p>

        {comprobante.estado !== 'emitido' ? (
          <p className="mt-6 rounded-xl bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#64748b] dark:bg-slate-800/60 dark:text-slate-400">
            Este comprobante ya está anulado — no se pueden emitir nuevas notas de crédito.
          </p>
        ) : (
          <AnularComprobanteForm
            comprobanteId={comprobante.id}
            numero={comprobante.numero}
            totalComprobante={Number(comprobante.total)}
            saldoDisponible={saldoActual}
            lineas={lineasParaAnular}
            motivos={MOTIVOS_PARCIALES}
          />
        )}
      </div>
    </div>
  )
}
