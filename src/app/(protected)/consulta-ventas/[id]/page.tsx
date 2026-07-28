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
  producto_id: number
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
      'id, tipo, serie, numero, subtotal, igv, total, estado, creado_en, fecha_emision, dias_credito, medio_pago, orden_venta_id, clientes(nombre, documento, direccion), vendedor:vendedor_id(nombre)'
    )
    .eq('id', id)
    .single()

  if (!comprobante) {
    notFound()
  }

  const cliente = Array.isArray(comprobante.clientes) ? comprobante.clientes[0] : comprobante.clientes
  const vendedor = Array.isArray(comprobante.vendedor) ? comprobante.vendedor[0] : comprobante.vendedor

  const [{ data: detalles }, { data: notasCredito }, { data: notasDebito }, { data: configuracion }] =
    await Promise.all([
      supabase
        .from('detalle_venta')
        .select('id, producto_id, cantidad, precio_unitario, productos(nombre)')
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

  const idsNotasCredito = (notasCredito ?? []).map((n) => n.id)
  const yaDevueltoPorProducto = new Map<number, number>()
  if (idsNotasCredito.length > 0) {
    const { data: detallesNc } = await supabase
      .from('detalle_nota_credito')
      .select('producto_id, cantidad')
      .in('nota_credito_id', idsNotasCredito)
    for (const d of detallesNc ?? []) {
      yaDevueltoPorProducto.set(d.producto_id, (yaDevueltoPorProducto.get(d.producto_id) ?? 0) + Number(d.cantidad))
    }
  }

  const lineasParaAnular = (detalles ?? []).map((d) => ({
    producto_id: d.producto_id,
    nombre: d.productos?.nombre ?? `Producto #${d.producto_id}`,
    cantidadVendida: Number(d.cantidad),
    precioUnitario: Number(d.precio_unitario),
    cantidadDisponible: Number(d.cantidad) - (yaDevueltoPorProducto.get(d.producto_id) ?? 0),
  }))

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

      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] bg-white p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {comprobante.estado === 'anulado' && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-red-700 uppercase">
            🚫 Comprobante anulado
          </div>
        )}

        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b]">
              {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
            </h1>
            <p className="mt-1 text-xs text-[#64748b]">
              {configuracion?.direccion || 'Piura, Perú'}
            </p>
            <p className="text-xs text-[#64748b]">{configuracion?.telefono && `Teléfono: ${configuracion.telefono}`}</p>
          </div>
          <div className="w-56 shrink-0 rounded-xl border-2 border-[#1e293b] p-4 text-center">
            {configuracion?.ruc && <p className="text-xs font-bold text-[#1e293b]">RUC {configuracion.ruc}</p>}
            <p className="mt-1 text-sm font-extrabold tracking-wide text-[#1e293b] uppercase">{tipoLabel}</p>
            <p className="mt-1 text-lg font-extrabold text-lime-600">{comprobante.numero}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Cliente</p>
            <p className="mt-1 font-bold text-[#1e293b]">{cliente?.nombre ?? '—'}</p>
            <p className="text-[#64748b]">
              {comprobante.tipo === 'factura' ? 'RUC' : 'Documento'}: {cliente?.documento || '—'}
            </p>
            {cliente?.direccion && <p className="text-[#64748b]">{cliente.direccion}</p>}
          </div>
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Datos de la venta</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Fecha de emisión</span>
                <span className="font-semibold">
                  {new Date(`${comprobante.fecha_emision}T00:00:00`).toLocaleDateString('es-PE')}
                </span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Días de crédito</span>
                <span className="font-semibold">{comprobante.dias_credito}</span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Medio de pago</span>
                <span className="font-semibold">{comprobante.medio_pago}</span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Vendedor</span>
                <span className="font-semibold">{vendedor?.nombre ?? '—'}</span>
              </p>
            </div>
          </div>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-y-2 border-[#1e293b] text-[#1e293b]">
              <th className="py-2 font-bold">Descripción</th>
              <th className="py-2 font-bold">Cantidad</th>
              <th className="py-2 font-bold">P. unit.</th>
              <th className="py-2 text-right font-bold">Valor venta</th>
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
          <div className="w-64 space-y-1.5 rounded-xl border border-[#e2e8f0] p-4">
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>Op. gravada</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(comprobante.subtotal).toFixed(2)}</span>
            </p>
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>IGV (18%)</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(comprobante.igv).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#1e293b] pt-2 text-lg font-extrabold text-[#1e293b]">
              <span>Importe total</span>
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
                    <span className="text-[#64748b]">
                      — Nota de crédito · {n.motivo} · anexada a {tipoLabel} {comprobante.numero}
                    </span>
                    {n.observacion && <p className="text-xs text-[#94a3b8]">{n.observacion}</p>}
                  </div>
                  <span className="font-bold text-red-700">S/ {Number(n.monto).toFixed(2)}</span>
                </div>
              ))}
              {(notasDebito ?? []).map((n) => (
                <div key={`nd-${n.id}`} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-bold text-amber-700">{n.numero}</span>{' '}
                    <span className="text-[#64748b]">
                      — Nota de débito · {n.motivo} · anexada a {tipoLabel} {comprobante.numero}
                    </span>
                    {n.observacion && <p className="text-xs text-[#94a3b8]">{n.observacion}</p>}
                  </div>
                  <span className="font-bold text-amber-700">S/ {Number(n.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-[#94a3b8]">
          Representación de {tipoLabel.toLowerCase()} generada por LimpiezaPro ERP — sin validez tributaria
          (sin integración con SUNAT).
        </p>
      </div>

      {comprobante.estado === 'emitido' && (
        <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr] print:hidden">
          <div className="rounded-3xl border-2 border-red-100 bg-white p-6 shadow-lg shadow-red-500/5">
            <h2 className="text-base font-extrabold text-[#1e293b]">🚫 Anular con Nota de Crédito</h2>
            <p className="mt-1 text-xs font-medium text-[#64748b]">
              N° {comprobante.numero} — solo "Anulación", "Anulación por error en el RUC" y "Devolución total"
              revierten todo el stock y anulan el comprobante. "Devolución por ítem" y "Descuento por ítem" te
              dejan elegir cuántas unidades de cada producto.
            </p>
            <AnularComprobanteForm comprobanteId={comprobante.id} numero={comprobante.numero} lineas={lineasParaAnular} />
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
