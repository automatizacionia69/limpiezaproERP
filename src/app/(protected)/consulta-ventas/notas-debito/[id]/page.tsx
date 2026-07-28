import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { ImprimirBoton } from '@/components/imprimir-boton'

export default async function NotaDebitoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('consulta_ventas')
  const { id } = await params
  const supabase = await createClient()

  const { data: nota } = await supabase
    .from('notas_debito')
    .select(
      'id, numero, motivo, monto, observacion, creado_en, comprobante_id, comprobantes(numero, tipo, total, clientes(nombre, documento, direccion))'
    )
    .eq('id', id)
    .single()

  if (!nota) {
    notFound()
  }

  const comprobante = Array.isArray(nota.comprobantes) ? nota.comprobantes[0] : nota.comprobantes
  const cliente = comprobante ? (Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes) : null

  const { data: configuracion } = await supabase
    .from('configuracion')
    .select('empresa, ruc, direccion, telefono')
    .eq('id', 1)
    .single()

  const totalOriginal = Number(comprobante?.total ?? 0)
  const nuevoMonto = totalOriginal + Number(nota.monto)
  const tipoLabel = comprobante ? (TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo) : '—'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/consulta-ventas/${nota.comprobante_id}`} className="text-sm font-bold text-[#64748b] hover:text-amber-600">
          ← Volver a {tipoLabel} {comprobante?.numero}
        </Link>
        <ImprimirBoton className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5">
          🖨️ Imprimir
        </ImprimirBoton>
      </div>

      <div className="mx-auto max-w-3xl rounded-3xl border-2 border-[#e2e8f0] bg-white p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b]">
              {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
            </h1>
            <p className="mt-1 text-xs text-[#64748b]">{configuracion?.direccion || 'Piura, Perú'}</p>
            <p className="text-xs text-[#64748b]">{configuracion?.telefono && `Teléfono: ${configuracion.telefono}`}</p>
          </div>
          <div className="w-56 shrink-0 rounded-xl border-2 border-amber-600 p-4 text-center">
            {configuracion?.ruc && <p className="text-xs font-bold text-[#1e293b]">RUC {configuracion.ruc}</p>}
            <p className="mt-1 text-sm font-extrabold tracking-wide text-amber-700 uppercase">Nota de débito</p>
            <p className="mt-1 text-lg font-extrabold text-amber-600">{nota.numero}</p>
          </div>
        </div>

        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Anexada a <span className="font-bold">{tipoLabel} {comprobante?.numero}</span> · Motivo:{' '}
          <span className="font-bold">{nota.motivo}</span>
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Cliente</p>
            <p className="mt-1 font-bold text-[#1e293b]">{cliente?.nombre ?? '—'}</p>
            <p className="text-[#64748b]">Documento: {cliente?.documento || '—'}</p>
            {cliente?.direccion && <p className="text-[#64748b]">{cliente.direccion}</p>}
          </div>
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Fecha de emisión</p>
            <p className="mt-1 font-semibold text-[#1e293b]">
              {new Date(nota.creado_en).toLocaleDateString('es-PE')}
            </p>
            {nota.observacion && (
              <>
                <p className="mt-2 text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Observación</p>
                <p className="text-[#64748b]">{nota.observacion}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 rounded-xl border border-[#e2e8f0] p-4">
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>Total original ({tipoLabel})</span>
              <span className="font-semibold text-[#1e293b]">S/ {totalOriginal.toFixed(2)}</span>
            </p>
            <p className="flex justify-between text-sm text-amber-700">
              <span>Monto de esta nota de débito</span>
              <span className="font-semibold">+ S/ {Number(nota.monto).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#1e293b] pt-2 text-lg font-extrabold text-[#1e293b]">
              <span>Nuevo monto a pagar</span>
              <span>S/ {nuevoMonto.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-[#94a3b8]">
          Nota de débito generada por LimpiezaPro ERP — sin validez tributaria (sin integración con SUNAT).
        </p>
      </div>
    </div>
  )
}
