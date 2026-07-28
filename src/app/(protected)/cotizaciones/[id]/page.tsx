import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DescargarPdfBoton } from './descargar-pdf-boton'
import { ConvertirVentaBoton } from './convertir-venta-boton'

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
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cotizacion }, { data: detalles }] = await Promise.all([
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

      <div className="mx-auto max-w-3xl rounded-3xl border-2 border-[#e2e8f0] bg-white p-10 shadow-lg shadow-slate-500/5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-[#f1f5f9] pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e293b]">Distribuidora LimpiezaPro</h1>
            <p className="text-sm text-[#64748b]">Gestión de Inventarios · Piura, Perú</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-sky-600">{cotizacion.numero}</p>
            <p className="text-sm text-[#64748b]">Cotización</p>
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
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Detalles</p>
            <p className="mt-1 text-[#1e293b]">
              Fecha: <span className="font-semibold">{cotizacion.fecha}</span>
            </p>
            <p className="text-[#1e293b]">
              Días de crédito: <span className="font-semibold">{cotizacion.dias_credito}</span>
            </p>
            <p className="text-[#1e293b]">
              Medio de pago: <span className="font-semibold">{cotizacion.medio_pago}</span>
            </p>
            <p className="text-[#1e293b]">
              Vendedor: <span className="font-semibold">{vendedor?.nombre ?? '—'}</span>
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
              <span className="font-semibold text-[#1e293b]">S/ {Number(cotizacion.subtotal).toFixed(2)}</span>
            </p>
            <p className="flex justify-between text-sm text-[#64748b]">
              <span>IGV (18%)</span>
              <span className="font-semibold text-[#1e293b]">S/ {Number(cotizacion.igv).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t-2 border-[#f1f5f9] pt-2 text-lg font-extrabold text-sky-600">
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

        <p className="mt-10 text-center text-xs text-[#94a3b8]">
          Cotización válida sujeta a disponibilidad de stock al momento de confirmar el pedido.
        </p>
      </div>
    </div>
  )
}
