import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { DescargarPdfBoton } from './descargar-pdf-boton'
import { ConvertirVentaBoton } from './convertir-venta-boton'
import { calcularFechaVencimiento } from '@/lib/motivos'

type DetalleRow = {
  id: number
  cantidad: number
  precio_unitario: number
  productos: { nombre: string } | null
}

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requierePermiso('cotizaciones')
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cotizacion }, { data: detalles }, { data: configuracion }] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select(
        'id, numero, fecha, dias_credito, medio_pago, subtotal, igv, total, observacion, clientes(nombre, documento, direccion), vendedor:vendedor_id(nombre)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('detalle_cotizacion')
      .select('id, cantidad, precio_unitario, productos(nombre)')
      .eq('cotizacion_id', id)
      .returns<DetalleRow[]>(),
    supabase.from('configuracion').select('empresa, ruc, direccion, telefono').eq('id', 1).single(),
  ])

  if (!cotizacion) {
    notFound()
  }

  const cliente = Array.isArray(cotizacion.clientes) ? cotizacion.clientes[0] : cotizacion.clientes
  const vendedor = Array.isArray(cotizacion.vendedor) ? cotizacion.vendedor[0] : cotizacion.vendedor

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/cotizaciones" className="text-sm font-bold text-[#64748b] hover:text-sky-600">
          ← Volver a Cotizaciones
        </Link>
        <div className="flex gap-3">
          <ConvertirVentaBoton id={cotizacion.id} numero={cotizacion.numero} />
          <DescargarPdfBoton />
        </div>
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-[#e2e8f0] bg-white p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#1e293b] pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b]">
              {configuracion?.empresa ?? 'Distribuidora LimpiezaPro'}
            </h1>
            <p className="mt-1 text-xs text-[#64748b]">{configuracion?.direccion || 'Piura, Perú'}</p>
            <p className="text-xs text-[#64748b]">{configuracion?.telefono && `Teléfono: ${configuracion.telefono}`}</p>
          </div>
          <div className="w-56 shrink-0 rounded-xl border-2 border-[#1e293b] p-4 text-center">
            {configuracion?.ruc && <p className="text-xs font-bold text-[#1e293b]">RUC {configuracion.ruc}</p>}
            <p className="mt-1 text-sm font-extrabold tracking-wide text-[#1e293b] uppercase">Cotización</p>
            <p className="mt-1 text-lg font-extrabold text-sky-600">{cotizacion.numero}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Cliente</p>
            <p className="mt-1 font-bold text-[#1e293b]">{cliente?.nombre ?? '—'}</p>
            <p className="text-[#64748b]">Documento: {cliente?.documento || '—'}</p>
            {cliente?.direccion && <p className="text-[#64748b]">{cliente.direccion}</p>}
          </div>
          <div className="rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">Detalles</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Fecha</span>
                <span className="font-semibold">{cotizacion.fecha}</span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Días de crédito</span>
                <span className="font-semibold">{cotizacion.dias_credito}</span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">
                  {cotizacion.dias_credito === 'Contado' ? 'Condición de pago' : 'Fecha de vencimiento'}
                </span>
                <span className="font-semibold">
                  {calcularFechaVencimiento(cotizacion.fecha, cotizacion.dias_credito)}
                </span>
              </p>
              <p className="flex justify-between text-[#1e293b]">
                <span className="text-[#64748b]">Medio de pago</span>
                <span className="font-semibold">{cotizacion.medio_pago}</span>
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
              <span className="font-semibold text-[#1e293b]">S/ {Number(cotizacion.subtotal).toFixed(2)}</span>
            </p>
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>IGV (18%)</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(cotizacion.igv).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#1e293b] pt-2 text-lg font-extrabold text-[#1e293b]">
              <span>Total</span>
              <span>S/ {Number(cotizacion.total).toFixed(2)}</span>
            </p>
          </div>
        </div>

        {cotizacion.observacion && (
          <div className="mt-6 rounded-xl bg-[#f8fafc] p-4 text-sm text-[#64748b]">
            <span className="font-bold text-[#1e293b]">Observación: </span>
            {cotizacion.observacion}
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-[#94a3b8]">
          Cotización válida sujeta a disponibilidad de stock al momento de confirmar el pedido — documento
          sin validez tributaria.
        </p>
      </div>
    </div>
  )
}
