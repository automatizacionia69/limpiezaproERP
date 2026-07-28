import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { AnularComprobanteForm } from './anular-form'
import { NotaDebitoForm } from './nota-debito-form'
import { ImprimirBoton } from '@/components/imprimir-boton'

type DetalleRow = {
  id: number
  cantidad: number
  precio_unitario: number
  productos: { nombre: string } | null
}

type NotaCreditoRow = {
  id: number
  numero: string
  motivo: string
  anula_operacion: boolean
  monto: number
  observacion: string | null
  creado_en: string
}

type NotaDebitoRow = {
  id: number
  numero: string
  motivo: string
  monto: number
  observacion: string | null
  creado_en: string
}

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('consulta_ventas')
  const { id } = await params
  const supabase = await createClient()

  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select(
      'id, tipo, serie, numero, subtotal, igv, total, estado, creado_en, orden_venta_id, clientes(nombre, documento, direccion)'
    )
    .eq('id', id)
    .single()

  if (!comprobante) {
    notFound()
  }

  const cliente = Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes

  const [{ data: detalles }, { data: notasCredito }, { data: notasDebito }, { data: configuracion }] =
    await Promise.all([
      supabase
        .from('detalle_venta')
        .select('id, cantidad, precio_unitario, productos(nombre)')
        .eq('orden_id', comprobante.orden_venta_id)
        .returns<DetalleRow[]>(),
      supabase
        .from('notas_credito')
        .select('id, numero, motivo, anula_operacion, monto, observacion, creado_en')
        .eq('comprobante_id', comprobante.id)
        .order('creado_en', { ascending: false })
        .returns<NotaCreditoRow[]>(),
      supabase
        .from('notas_debito')
        .select('id, numero, motivo, monto, observacion, creado_en')
        .eq('comprobante_id', comprobante.id)
        .order('creado_en', { ascending: false })
        .returns<NotaDebitoRow[]>(),
      supabase.from('configuracion').select('empresa, ruc, direccion, telefono').eq('id', 1).single(),
    ])

  const tipoLabel = TIPO_COMPROBANTE_LABELS[comprobante.tipo] ?? comprobante.tipo

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] hover:text-lime-600">
          ← Volver a Consulta de Ventas
        </Link>
        <ImprimirBoton className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-lime-500/30 transition-all hover:-translate-y-0.5">
          🖨️ Imprimir
        </ImprimirBoton>
      </div>

      <div className="mx-auto max-w-3xl rounded-3xl border-2 border-[#e2e8f0] bg-white p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-[#f1f5f9] pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e293b]">
              {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
            </h1>
            <p className="text-sm text-[#64748b]">
              {[configuracion?.ruc && `RUC ${configuracion.ruc}`, configuracion?.direccion, configuracion?.telefono]
                .filter(Boolean)
                .join(' · ') || 'Gestión de Inventarios · Piura, Perú'}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                comprobante.estado === 'emitido' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {comprobante.estado === 'emitido' ? 'Emitido' : 'Anulado'}
            </span>
            <p className="mt-2 text-lg font-extrabold text-lime-600">{comprobante.numero}</p>
            <p className="text-sm text-[#64748b]">{tipoLabel}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Cliente</p>
            <p className="mt-1 font-bold text-[#1e293b]">{cliente?.nombre ?? '—'}</p>
            {cliente?.documento && <p className="text-[#64748b]">{cliente.documento}</p>}
            {cliente?.direccion && <p className="text-[#64748b]">{cliente.direccion}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Fecha de emisión</p>
            <p className="mt-1 text-[#1e293b]">
              {new Date(comprobante.creado_en).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[#f1f5f9] text-[#64748b]">
              <th className="py-2 font-bold">Producto</th>
              <th className="py-2 font-bold">Cantidad</th>
              <th className="py-2 font-bold">Precio unit.</th>
              <th className="py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(detalles ?? []).map((d) => (
              <tr key={d.id} className="border-b border-[#f1f5f9]">
                <td className="py-2.5">{d.productos?.nombre ?? '—'}</td>
                <td className="py-2.5">{d.cantidad}</td>
                <td className="py-2.5">S/ {Number(d.precio_unitario).toFixed(2)}</td>
                <td className="py-2.5 text-right">
                  S/ {(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5">
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>Subtotal (sin IGV)</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(comprobante.subtotal).toFixed(2)}</span>
            </p>
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>IGV (18%)</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(comprobante.igv).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#f1f5f9] pt-2 text-lg font-extrabold text-lime-600">
              <span>Total</span>
              <span>S/ {Number(comprobante.total).toFixed(2)}</span>
            </p>
          </div>
        </div>

        {((notasCredito && notasCredito.length > 0) || (notasDebito && notasDebito.length > 0)) && (
          <div className="mt-8 border-t-2 border-[#f1f5f9] pt-6">
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Notas asociadas</p>
            <div className="mt-3 space-y-2">
              {(notasCredito ?? []).map((n) => (
                <div key={`nc-${n.id}`} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-bold text-red-700">{n.numero}</span>{' '}
                    <span className="text-[#64748b]">— Nota de crédito · {n.motivo}</span>
                    {n.observacion && <p className="text-xs text-[#94a3b8]">{n.observacion}</p>}
                  </div>
                  <span className="font-bold text-red-700">S/ {Number(n.monto).toFixed(2)}</span>
                </div>
              ))}
              {(notasDebito ?? []).map((n) => (
                <div key={`nd-${n.id}`} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-bold text-amber-700">{n.numero}</span>{' '}
                    <span className="text-[#64748b]">— Nota de débito · {n.motivo}</span>
                    {n.observacion && <p className="text-xs text-[#94a3b8]">{n.observacion}</p>}
                  </div>
                  <span className="font-bold text-amber-700">S/ {Number(n.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {comprobante.estado === 'emitido' && (
        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 print:hidden">
          <div className="rounded-3xl border-2 border-red-100 bg-white p-6 shadow-lg shadow-red-500/5">
            <h2 className="text-base font-extrabold text-[#1e293b]">🚫 Anular con Nota de Crédito</h2>
            <p className="mt-1 text-xs font-medium text-[#64748b]">
              Solo los motivos de anulación/devolución total revierten el stock y anulan el comprobante.
            </p>
            <AnularComprobanteForm comprobanteId={comprobante.id} />
          </div>

          <div className="rounded-3xl border-2 border-amber-100 bg-white p-6 shadow-lg shadow-amber-500/5">
            <h2 className="text-base font-extrabold text-[#1e293b]">➕ Registrar Nota de Débito</h2>
            <p className="mt-1 text-xs font-medium text-[#64748b]">
              Un cargo adicional sobre este comprobante (interés, aumento de valor, etc.).
            </p>
            <NotaDebitoForm comprobanteId={comprobante.id} />
          </div>
        </div>
      )}
    </div>
  )
}
