import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO, haceUnMesPeruISO } from '@/lib/fecha'
import { IGV_TASA } from '@/lib/cotizaciones'
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

type NotaRow = {
  id: number
  numero: string
  monto: number
  creado_en: string
  comprobante_id: number
}

type Fila = {
  fecha: string
  tipo: string
  serie: string
  numero: string
  ruc: string
  cliente: string
  vendedor: string
  subtotal: number
  igv: number
  total: number
  unidades: number
  items: number
  medioPago: string
  estado: string
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default async function ReporteVentasPorClientePage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  await requierePermiso('consulta_ventas')
  const { desde = haceUnMesPeruISO(), hasta = hoyPeruISO() } = await searchParams
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
      ? supabase
          .from('notas_credito')
          .select('id, numero, monto, creado_en, comprobante_id')
          .in('comprobante_id', comprobanteIds)
          .returns<NotaRow[]>()
      : Promise.resolve({ data: [] as NotaRow[] }),
    comprobanteIds.length > 0
      ? supabase
          .from('notas_debito')
          .select('id, numero, monto, creado_en, comprobante_id')
          .in('comprobante_id', comprobanteIds)
          .returns<NotaRow[]>()
      : Promise.resolve({ data: [] as NotaRow[] }),
  ])

  const unidadesPorOrden = new Map<number, number>()
  const itemsPorOrden = new Map<number, number>()
  for (const d of detalles ?? []) {
    unidadesPorOrden.set(d.orden_id, (unidadesPorOrden.get(d.orden_id) ?? 0) + Number(d.cantidad))
    itemsPorOrden.set(d.orden_id, (itemsPorOrden.get(d.orden_id) ?? 0) + 1)
  }

  const infoPorComprobante = new Map<number, { ruc: string; cliente: string; vendedor: string }>()
  for (const c of comprobantes ?? []) {
    const cliente = unoDe(c.clientes)
    const vendedor = unoDe(c.vendedor)
    infoPorComprobante.set(c.id, {
      ruc: cliente?.documento ?? '',
      cliente: cliente?.nombre ?? '—',
      vendedor: vendedor?.nombre ?? '—',
    })
  }

  const filasComprobantes: Fila[] = (comprobantes ?? []).map((c) => {
    const info = infoPorComprobante.get(c.id)!
    return {
      fecha: c.fecha_emision,
      tipo: TIPO_COMPROBANTE_LABELS[c.tipo] ?? c.tipo,
      serie: c.serie,
      numero: c.numero,
      ruc: info.ruc,
      cliente: info.cliente,
      vendedor: info.vendedor,
      subtotal: Number(c.subtotal),
      igv: Number(c.igv),
      total: Number(c.total),
      unidades: unidadesPorOrden.get(c.orden_venta_id) ?? 0,
      items: itemsPorOrden.get(c.orden_venta_id) ?? 0,
      medioPago: c.medio_pago,
      estado: c.estado === 'emitido' ? 'Emitido' : 'Anulado',
    }
  })

  const filasNotasCredito: Fila[] = (notasCredito ?? []).map((n) => {
    const info = infoPorComprobante.get(n.comprobante_id)
    const sinIgv = Number(n.monto) / (1 + IGV_TASA)
    const igv = Number(n.monto) - sinIgv
    return {
      fecha: n.creado_en.slice(0, 10),
      tipo: 'Nota de crédito',
      serie: 'NC01',
      numero: n.numero,
      ruc: info?.ruc ?? '',
      cliente: info?.cliente ?? '—',
      vendedor: info?.vendedor ?? '—',
      subtotal: -sinIgv,
      igv: -igv,
      total: -Number(n.monto),
      unidades: 0,
      items: 0,
      medioPago: '—',
      estado: 'Emitido',
    }
  })

  const filasNotasDebito: Fila[] = (notasDebito ?? []).map((n) => {
    const info = infoPorComprobante.get(n.comprobante_id)
    const sinIgv = Number(n.monto) / (1 + IGV_TASA)
    const igv = Number(n.monto) - sinIgv
    return {
      fecha: n.creado_en.slice(0, 10),
      tipo: 'Nota de débito',
      serie: 'ND01',
      numero: n.numero,
      ruc: info?.ruc ?? '',
      cliente: info?.cliente ?? '—',
      vendedor: info?.vendedor ?? '—',
      subtotal: sinIgv,
      igv,
      total: Number(n.monto),
      unidades: 0,
      items: 0,
      medioPago: '—',
      estado: 'Emitido',
    }
  })

  const filas = [...filasComprobantes, ...filasNotasCredito, ...filasNotasDebito].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

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
    f.unidades,
    f.items,
    f.medioPago,
    f.estado,
  ])

  const totalGeneral = filas.reduce((acc, f) => acc + f.total, 0)

  return (
    <div>
      <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-lime-600">
        ← Volver a Consulta de Ventas
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📊 Reporte de ventas por cliente</h1>
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

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-5">
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-lime-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#64748b] dark:text-slate-400">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="mt-1 rounded-xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] px-3 py-2 text-sm text-[#1e293b] dark:text-slate-100 outline-none focus:border-lime-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-lime-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-lime-500/30 transition-all hover:bg-lime-700"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        <p className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-6 py-4 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {filas.length} movimiento{filas.length === 1 ? '' : 's'} entre {desde} y {hasta} · Total: S/{' '}
          {totalGeneral.toFixed(2)}
        </p>
        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b] dark:text-slate-400">No hay ventas en ese rango de fechas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 text-[#64748b] dark:text-slate-400">
                  <th className="px-5 py-3 font-bold">Fecha</th>
                  <th className="px-5 py-3 font-bold">Tipo</th>
                  <th className="px-5 py-3 font-bold">Número</th>
                  <th className="px-5 py-3 font-bold">RUC/DNI</th>
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Vendedor</th>
                  <th className="px-5 py-3 font-bold">Sin IGV</th>
                  <th className="px-5 py-3 font-bold">IGV</th>
                  <th className="px-5 py-3 font-bold">Total</th>
                  <th className="px-5 py-3 font-bold">Unid.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100">
                    <td className="px-5 py-2.5 whitespace-nowrap text-[#64748b] dark:text-slate-400">{f.fecha}</td>
                    <td className="px-5 py-2.5">{f.tipo}</td>
                    <td className="px-5 py-2.5 font-semibold">{f.numero}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">{f.ruc || '—'}</td>
                    <td className="px-5 py-2.5">{f.cliente}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">{f.vendedor}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">S/ {f.subtotal.toFixed(2)}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">S/ {f.igv.toFixed(2)}</td>
                    <td
                      className={`px-5 py-2.5 font-semibold ${
                        f.tipo === 'Nota de crédito' ? 'text-red-600' : f.tipo === 'Nota de débito' ? 'text-amber-700' : ''
                      }`}
                    >
                      S/ {f.total.toFixed(2)}
                    </td>
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
