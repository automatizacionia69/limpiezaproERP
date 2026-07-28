import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { DescargarExcelBoton } from '@/components/descargar-excel-boton'

type ComprobanteRow = {
  id: number
  tipo: string
  serie: string
  numero: string
  fecha_emision: string
  subtotal: number
  igv: number
  total: number
  estado: string
  medio_pago: string
  orden_venta_id: number
  clientes: { nombre: string; documento: string | null } | { nombre: string; documento: string | null }[] | null
  vendedor: { nombre: string } | { nombre: string }[] | null
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function haceUnMesISO() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default async function ReporteVentasPorClientePage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  await requierePermiso('consulta_ventas')
  const { desde = haceUnMesISO(), hasta = hoyISO() } = await searchParams
  const supabase = await createClient()

  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select(
      'id, tipo, serie, numero, fecha_emision, subtotal, igv, total, estado, medio_pago, orden_venta_id, clientes(nombre, documento), vendedor:vendedor_id(nombre)'
    )
    .gte('fecha_emision', desde)
    .lte('fecha_emision', hasta)
    .order('fecha_emision', { ascending: false })
    .returns<ComprobanteRow[]>()

  const ordenIds = (comprobantes ?? []).map((c) => c.orden_venta_id)
  const comprobanteIds = (comprobantes ?? []).map((c) => c.id)

  const [{ data: detalles }, { data: notasCredito }, { data: notasDebito }] = await Promise.all([
    ordenIds.length > 0
      ? supabase.from('detalle_venta').select('orden_id, cantidad').in('orden_id', ordenIds)
      : Promise.resolve({ data: [] as { orden_id: number; cantidad: number }[] }),
    comprobanteIds.length > 0
      ? supabase.from('notas_credito').select('comprobante_id, monto').in('comprobante_id', comprobanteIds)
      : Promise.resolve({ data: [] as { comprobante_id: number; monto: number }[] }),
    comprobanteIds.length > 0
      ? supabase.from('notas_debito').select('comprobante_id, monto').in('comprobante_id', comprobanteIds)
      : Promise.resolve({ data: [] as { comprobante_id: number; monto: number }[] }),
  ])

  const unidadesPorOrden = new Map<number, number>()
  const itemsPorOrden = new Map<number, number>()
  for (const d of detalles ?? []) {
    unidadesPorOrden.set(d.orden_id, (unidadesPorOrden.get(d.orden_id) ?? 0) + Number(d.cantidad))
    itemsPorOrden.set(d.orden_id, (itemsPorOrden.get(d.orden_id) ?? 0) + 1)
  }

  const notasCreditoPorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    notasCreditoPorComprobante.set(n.comprobante_id, (notasCreditoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }
  const notasDebitoPorComprobante = new Map<number, number>()
  for (const n of notasDebito ?? []) {
    notasDebitoPorComprobante.set(n.comprobante_id, (notasDebitoPorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const filas = (comprobantes ?? []).map((c) => {
    const cliente = unoDe(c.clientes)
    const vendedor = unoDe(c.vendedor)
    const notaCredito = notasCreditoPorComprobante.get(c.id) ?? 0
    const notaDebito = notasDebitoPorComprobante.get(c.id) ?? 0
    return {
      fecha: c.fecha_emision,
      tipo: TIPO_COMPROBANTE_LABELS[c.tipo] ?? c.tipo,
      serie: c.serie,
      numero: c.numero,
      ruc: cliente?.documento ?? '',
      cliente: cliente?.nombre ?? '—',
      vendedor: vendedor?.nombre ?? '—',
      subtotal: Number(c.subtotal),
      igv: Number(c.igv),
      total: Number(c.total),
      notaCredito,
      notaDebito,
      ventaNeta: Math.max(0, Number(c.total) - notaCredito + notaDebito),
      unidades: unidadesPorOrden.get(c.orden_venta_id) ?? 0,
      items: itemsPorOrden.get(c.orden_venta_id) ?? 0,
      medioPago: c.medio_pago,
      estado: c.estado,
    }
  })

  const filasExcel = filas.map((f) => [
    f.fecha,
    f.tipo,
    f.serie,
    f.numero,
    f.ruc,
    f.cliente,
    f.vendedor,
    Number(f.subtotal.toFixed(2)),
    Number(f.igv.toFixed(2)),
    Number(f.total.toFixed(2)),
    Number(f.notaCredito.toFixed(2)),
    Number(f.notaDebito.toFixed(2)),
    Number(f.ventaNeta.toFixed(2)),
    f.unidades,
    f.items,
    f.medioPago,
    f.estado === 'emitido' ? 'Emitido' : 'Anulado',
  ])

  const totalGeneral = filas.reduce((acc, f) => acc + f.total, 0)
  const totalNeto = filas.reduce((acc, f) => acc + f.ventaNeta, 0)

  return (
    <div>
      <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] hover:text-lime-600">
        ← Volver a Consulta de Ventas
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1e293b]">📊 Reporte de ventas por cliente</h1>
        <DescargarExcelBoton
          nombreArchivo={`ventas-por-cliente-${desde}-a-${hasta}.xlsx`}
          hoja="Ventas por cliente"
          encabezados={[
            'Fecha',
            'Tipo',
            'Serie',
            'Número',
            'RUC/DNI',
            'Cliente',
            'Vendedor',
            'Monto sin IGV',
            'IGV',
            'Total',
            'Nota de crédito',
            'Nota de débito',
            'Venta neta',
            'Unidades',
            'N° de ítems',
            'Medio de pago',
            'Estado',
          ]}
          filas={filasExcel}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-lime-500/30 transition-all hover:-translate-y-0.5"
        >
          ⬇️ Descargar Excel
        </DescargarExcelBoton>
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] bg-white p-5">
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b] outline-none focus:border-lime-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b]">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#1e293b] outline-none focus:border-lime-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-lime-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-lime-500/30 transition-all hover:bg-lime-700"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        <p className="border-b-2 border-[#f1f5f9] px-6 py-4 text-sm font-medium text-[#64748b]">
          {filas.length} comprobante{filas.length === 1 ? '' : 's'} entre {desde} y {hasta} · Total bruto: S/{' '}
          {totalGeneral.toFixed(2)} ·{' '}
          <span className="font-bold text-lime-700">Venta neta (con NC/ND): S/ {totalNeto.toFixed(2)}</span>
        </p>
        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">No hay ventas en ese rango de fechas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-5 py-3 font-bold">Fecha</th>
                  <th className="px-5 py-3 font-bold">Tipo</th>
                  <th className="px-5 py-3 font-bold">Número</th>
                  <th className="px-5 py-3 font-bold">RUC/DNI</th>
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Vendedor</th>
                  <th className="px-5 py-3 font-bold">Sin IGV</th>
                  <th className="px-5 py-3 font-bold">IGV</th>
                  <th className="px-5 py-3 font-bold">Total</th>
                  <th className="px-5 py-3 font-bold">Venta neta</th>
                  <th className="px-5 py-3 font-bold">Unid.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] text-[#1e293b]">
                    <td className="px-5 py-2.5 whitespace-nowrap text-[#64748b]">{f.fecha}</td>
                    <td className="px-5 py-2.5">{f.tipo}</td>
                    <td className="px-5 py-2.5 font-semibold">{f.numero}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">{f.ruc || '—'}</td>
                    <td className="px-5 py-2.5">{f.cliente}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">{f.vendedor}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">S/ {f.subtotal.toFixed(2)}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">S/ {f.igv.toFixed(2)}</td>
                    <td className="px-5 py-2.5 font-semibold">S/ {f.total.toFixed(2)}</td>
                    <td className="px-5 py-2.5 font-bold text-lime-700">S/ {f.ventaNeta.toFixed(2)}</td>
                    <td className="px-5 py-2.5">{f.unidades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
