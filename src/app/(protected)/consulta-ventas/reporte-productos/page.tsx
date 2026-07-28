import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { IGV_TASA } from '@/lib/cotizaciones'
import { TIPO_COMPROBANTE_LABELS } from '@/lib/motivos'
import { DescargarExcelBoton } from '@/components/descargar-excel-boton'

type ComprobanteRow = {
  id: number
  tipo: string
  serie: string
  numero: string
  fecha_emision: string
  estado: string
  orden_venta_id: number
  clientes: { nombre: string; documento: string | null } | { nombre: string; documento: string | null }[] | null
  vendedor: { nombre: string } | { nombre: string }[] | null
}

type DetalleRow = {
  orden_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  productos: { nombre: string; unidades_medida: { nombre: string } | { nombre: string }[] | null; categorias: { nombre: string } | { nombre: string }[] | null } | null
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

export default async function ReporteVentasPorProductoPage({
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
      'id, tipo, serie, numero, fecha_emision, estado, orden_venta_id, clientes(nombre, documento), vendedor:vendedor_id(nombre)'
    )
    .gte('fecha_emision', desde)
    .lte('fecha_emision', hasta)
    .order('fecha_emision', { ascending: false })
    .returns<ComprobanteRow[]>()

  const ordenIds = (comprobantes ?? []).map((c) => c.orden_venta_id)
  const comprobanteIds = (comprobantes ?? []).map((c) => c.id)

  const [{ data: detalles }, { data: notasCredito }] = await Promise.all([
    ordenIds.length > 0
      ? supabase
          .from('detalle_venta')
          .select('orden_id, producto_id, cantidad, precio_unitario, productos(nombre, unidades_medida(nombre), categorias(nombre))')
          .in('orden_id', ordenIds)
          .returns<DetalleRow[]>()
      : Promise.resolve({ data: [] as DetalleRow[] }),
    comprobanteIds.length > 0
      ? supabase.from('notas_credito').select('id, comprobante_id, anula_operacion').in('comprobante_id', comprobanteIds)
      : Promise.resolve({ data: [] as { id: number; comprobante_id: number; anula_operacion: boolean }[] }),
  ])

  const idsNotasItem = (notasCredito ?? []).filter((n) => !n.anula_operacion).map((n) => n.id)
  const { data: detallesNc } =
    idsNotasItem.length > 0
      ? await supabase.from('detalle_nota_credito').select('nota_credito_id, producto_id, cantidad').in('nota_credito_id', idsNotasItem)
      : { data: [] as { nota_credito_id: number; producto_id: number; cantidad: number }[] }

  const notaPorId = new Map((notasCredito ?? []).map((n) => [n.id, n]))
  const comprobantesAnulados = new Set((notasCredito ?? []).filter((n) => n.anula_operacion).map((n) => n.comprobante_id))

  const devueltoPorComprobanteProducto = new Map<string, number>()
  for (const d of detallesNc ?? []) {
    const nota = notaPorId.get(d.nota_credito_id)
    if (!nota) continue
    const clave = `${nota.comprobante_id}-${d.producto_id}`
    devueltoPorComprobanteProducto.set(clave, (devueltoPorComprobanteProducto.get(clave) ?? 0) + Number(d.cantidad))
  }

  const detallesPorOrden = new Map<number, DetalleRow[]>()
  for (const d of detalles ?? []) {
    const lista = detallesPorOrden.get(d.orden_id) ?? []
    lista.push(d)
    detallesPorOrden.set(d.orden_id, lista)
  }

  const filas = (comprobantes ?? []).flatMap((c) => {
    const cliente = unoDe(c.clientes)
    const vendedor = unoDe(c.vendedor)
    const lineas = detallesPorOrden.get(c.orden_venta_id) ?? []

    return lineas.map((d) => {
      const producto = d.productos
      const unidad = unoDe(producto?.unidades_medida ?? null)
      const categoria = unoDe(producto?.categorias ?? null)
      const precioSinIgv = Number(d.precio_unitario) / (1 + IGV_TASA)
      const cantidad = Number(d.cantidad)
      const devuelto = comprobantesAnulados.has(c.id)
        ? cantidad
        : Math.min(cantidad, devueltoPorComprobanteProducto.get(`${c.id}-${d.producto_id}`) ?? 0)
      const cantidadNeta = cantidad - devuelto
      const subtotalLinea = cantidad * precioSinIgv
      const totalLinea = cantidad * Number(d.precio_unitario)
      const igvLinea = totalLinea - subtotalLinea
      const totalLineaNeto = cantidadNeta * Number(d.precio_unitario)

      return {
        fecha: c.fecha_emision,
        tipo: TIPO_COMPROBANTE_LABELS[c.tipo] ?? c.tipo,
        serie: c.serie,
        numero: c.numero,
        ruc: cliente?.documento ?? '',
        cliente: cliente?.nombre ?? '—',
        vendedor: vendedor?.nombre ?? '—',
        producto: producto?.nombre ?? '—',
        categoria: categoria?.nombre ?? '—',
        unidadMedida: unidad?.nombre ?? '—',
        cantidad,
        cantidadDevuelta: devuelto,
        cantidadNeta,
        precioSinIgv,
        subtotalLinea,
        igvLinea,
        totalLinea,
        totalLineaNeto,
        estado: c.estado,
      }
    })
  })

  const filasExcel = filas.map((f) => [
    f.fecha,
    f.tipo,
    f.serie,
    f.numero,
    f.ruc,
    f.cliente,
    f.vendedor,
    f.producto,
    f.categoria,
    f.unidadMedida,
    f.cantidad,
    f.cantidadDevuelta,
    f.cantidadNeta,
    Number(f.precioSinIgv.toFixed(2)),
    Number(f.subtotalLinea.toFixed(2)),
    Number(f.igvLinea.toFixed(2)),
    Number(f.totalLinea.toFixed(2)),
    Number(f.totalLineaNeto.toFixed(2)),
    f.estado === 'emitido' ? 'Emitido' : 'Anulado',
  ])

  const totalGeneral = filas.reduce((acc, f) => acc + f.totalLinea, 0)
  const totalNeto = filas.reduce((acc, f) => acc + f.totalLineaNeto, 0)
  const unidadesGeneral = filas.reduce((acc, f) => acc + f.cantidad, 0)

  return (
    <div>
      <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] hover:text-lime-600">
        ← Volver a Consulta de Ventas
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1e293b]">📦 Reporte de ventas por producto</h1>
        <DescargarExcelBoton
          nombreArchivo={`ventas-por-producto-${desde}-a-${hasta}.xlsx`}
          hoja="Ventas por producto"
          encabezados={[
            'Fecha',
            'Tipo',
            'Serie',
            'Número',
            'RUC/DNI',
            'Cliente',
            'Vendedor',
            'Producto',
            'Categoría',
            'Unidad',
            'Cantidad vendida',
            'Cantidad devuelta (NC)',
            'Cantidad neta',
            'Precio unit. sin IGV',
            'Subtotal sin IGV',
            'IGV',
            'Total línea',
            'Total línea neto',
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
          {filas.length} línea{filas.length === 1 ? '' : 's'} de producto entre {desde} y {hasta} · {unidadesGeneral}{' '}
          unidades · Total bruto: S/ {totalGeneral.toFixed(2)} ·{' '}
          <span className="font-bold text-lime-700">Total neto (con NC): S/ {totalNeto.toFixed(2)}</span>
        </p>
        {filas.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-[#64748b]">No hay ventas en ese rango de fechas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc] text-[#64748b]">
                  <th className="px-5 py-3 font-bold">Fecha</th>
                  <th className="px-5 py-3 font-bold">Número</th>
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Producto</th>
                  <th className="px-5 py-3 font-bold">Unidad</th>
                  <th className="px-5 py-3 font-bold">Cant.</th>
                  <th className="px-5 py-3 font-bold">Devuelta</th>
                  <th className="px-5 py-3 font-bold">P. unit. sin IGV</th>
                  <th className="px-5 py-3 font-bold">Total línea</th>
                  <th className="px-5 py-3 font-bold">Total neto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] text-[#1e293b]">
                    <td className="px-5 py-2.5 whitespace-nowrap text-[#64748b]">{f.fecha}</td>
                    <td className="px-5 py-2.5 font-semibold">{f.numero}</td>
                    <td className="px-5 py-2.5">{f.cliente}</td>
                    <td className="px-5 py-2.5">{f.producto}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">{f.unidadMedida}</td>
                    <td className="px-5 py-2.5">{f.cantidad}</td>
                    <td className="px-5 py-2.5 text-red-600">{f.cantidadDevuelta > 0 ? `− ${f.cantidadDevuelta}` : '—'}</td>
                    <td className="px-5 py-2.5 text-[#64748b]">S/ {f.precioSinIgv.toFixed(2)}</td>
                    <td className="px-5 py-2.5 font-semibold">S/ {f.totalLinea.toFixed(2)}</td>
                    <td className="px-5 py-2.5 font-bold text-lime-700">S/ {f.totalLineaNeto.toFixed(2)}</td>
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
