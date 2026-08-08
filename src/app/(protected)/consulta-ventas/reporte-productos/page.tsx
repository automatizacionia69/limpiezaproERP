import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requierePermiso } from '@/lib/permisos'
import { hoyPeruISO, haceUnMesPeruISO } from '@/lib/fecha'
import { IGV_TASA } from '@/lib/cotizaciones'
import { afectacionPorCodigo } from '@/lib/afectacion-igv'
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
  tipo_afectacion_igv: string
  productos: {
    nombre: string
    unidades_medida: { nombre: string } | { nombre: string }[] | null
    categorias: { nombre: string } | { nombre: string }[] | null
  } | null
}

type NotaCreditoRow = { id: number; numero: string; anula_operacion: boolean; creado_en: string; comprobante_id: number }
type DetalleNcRow = {
  nota_credito_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  tipo_afectacion_igv: string
}

type Fila = {
  fecha: string
  tipo: string
  serie: string
  numero: string
  ruc: string
  cliente: string
  vendedor: string
  producto: string
  categoria: string
  unidadMedida: string
  cantidad: number
  precioSinIgv: number
  subtotalLinea: number
  igvLinea: number
  totalLinea: number
  estado: string
}

function unoDe<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default async function ReporteVentasPorProductoPage({
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
          .select('orden_id, producto_id, cantidad, precio_unitario, tipo_afectacion_igv, productos(nombre, unidades_medida(nombre), categorias(nombre))')
          .in('orden_id', ordenIds)
          .returns<DetalleRow[]>()
      : Promise.resolve({ data: [] as DetalleRow[] }),
    comprobanteIds.length > 0
      ? supabase
          .from('notas_credito')
          .select('id, numero, anula_operacion, creado_en, comprobante_id')
          .in('comprobante_id', comprobanteIds)
          .returns<NotaCreditoRow[]>()
      : Promise.resolve({ data: [] as NotaCreditoRow[] }),
  ])

  const idsNotasItem = (notasCredito ?? []).filter((n) => !n.anula_operacion).map((n) => n.id)
  const { data: detallesNc } =
    idsNotasItem.length > 0
      ? await supabase
          .from('detalle_nota_credito')
          .select('nota_credito_id, producto_id, cantidad, precio_unitario, tipo_afectacion_igv')
          .in('nota_credito_id', idsNotasItem)
          .returns<DetalleNcRow[]>()
      : { data: [] as DetalleNcRow[] }

  const infoPorComprobante = new Map<number, { ruc: string; cliente: string; vendedor: string }>()
  const detallesPorOrden = new Map<number, DetalleRow[]>()
  const comprobantePorId = new Map<number, ComprobanteRow>()
  for (const c of comprobantes ?? []) {
    const cliente = unoDe(c.clientes)
    const vendedor = unoDe(c.vendedor)
    infoPorComprobante.set(c.id, {
      ruc: cliente?.documento ?? '',
      cliente: cliente?.nombre ?? '—',
      vendedor: vendedor?.nombre ?? '—',
    })
    comprobantePorId.set(c.id, c)
  }
  for (const d of detalles ?? []) {
    const lista = detallesPorOrden.get(d.orden_id) ?? []
    lista.push(d)
    detallesPorOrden.set(d.orden_id, lista)
  }

  function filaProducto(
    c: ComprobanteRow,
    productoNombre: string,
    categoria: string,
    unidad: string,
    cantidad: number,
    precioUnitario: number,
    tipoLabel: string,
    numero: string,
    serie: string,
    fecha: string,
    tipoAfectacionIgv: string
  ): Fila {
    const info = infoPorComprobante.get(c.id)!
    const afectoIgv = afectacionPorCodigo(tipoAfectacionIgv).afectoIgv
    const precioSinIgv = afectoIgv ? precioUnitario / (1 + IGV_TASA) : precioUnitario
    const subtotalLinea = cantidad * precioSinIgv
    const totalLinea = cantidad * precioUnitario
    const igvLinea = totalLinea - subtotalLinea
    return {
      fecha,
      tipo: tipoLabel,
      serie,
      numero,
      ruc: info.ruc,
      cliente: info.cliente,
      vendedor: info.vendedor,
      producto: productoNombre,
      categoria,
      unidadMedida: unidad,
      cantidad,
      precioSinIgv,
      subtotalLinea,
      igvLinea,
      totalLinea,
      estado: c.estado === 'emitido' ? 'Emitido' : 'Anulado',
    }
  }

  const filasVenta: Fila[] = (comprobantes ?? []).flatMap((c) => {
    const lineas = detallesPorOrden.get(c.orden_venta_id) ?? []
    return lineas.map((d) => {
      const producto = d.productos
      const unidad = unoDe(producto?.unidades_medida ?? null)
      const categoria = unoDe(producto?.categorias ?? null)
      return filaProducto(
        c,
        producto?.nombre ?? '—',
        categoria?.nombre ?? '—',
        unidad?.nombre ?? '—',
        Number(d.cantidad),
        Number(d.precio_unitario),
        TIPO_COMPROBANTE_LABELS[c.tipo] ?? c.tipo,
        c.numero,
        c.serie,
        c.fecha_emision,
        d.tipo_afectacion_igv
      )
    })
  })

  const productoPorId = new Map<number, DetalleRow['productos']>()
  for (const d of detalles ?? []) {
    if (d.productos) productoPorId.set(d.producto_id, d.productos)
  }

  const filasNotasCredito: Fila[] = (notasCredito ?? []).flatMap((n) => {
    const c = comprobantePorId.get(n.comprobante_id)
    if (!c) return []
    const fecha = n.creado_en.slice(0, 10)

    if (n.anula_operacion) {
      const lineas = detallesPorOrden.get(c.orden_venta_id) ?? []
      return lineas.map((d) => {
        const producto = d.productos
        const unidad = unoDe(producto?.unidades_medida ?? null)
        const categoria = unoDe(producto?.categorias ?? null)
        return filaProducto(
          c,
          producto?.nombre ?? '—',
          categoria?.nombre ?? '—',
          unidad?.nombre ?? '—',
          -Number(d.cantidad),
          Number(d.precio_unitario),
          'Nota de crédito',
          n.numero,
          n.numero.split('-')[0],
          fecha,
          d.tipo_afectacion_igv
        )
      })
    }

    const detallesDeNota = (detallesNc ?? []).filter((dn) => dn.nota_credito_id === n.id)
    return detallesDeNota.map((dn) => {
      const producto = productoPorId.get(dn.producto_id)
      const unidad = unoDe(producto?.unidades_medida ?? null)
      const categoria = unoDe(producto?.categorias ?? null)
      return filaProducto(
        c,
        producto?.nombre ?? '—',
        categoria?.nombre ?? '—',
        unidad?.nombre ?? '—',
        -Number(dn.cantidad),
        Number(dn.precio_unitario),
        'Nota de crédito',
        n.numero,
        n.numero.split('-')[0],
        fecha,
        dn.tipo_afectacion_igv
      )
    })
  })

  const filas = [...filasVenta, ...filasNotasCredito].sort(
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
    f.producto,
    f.categoria,
    f.unidadMedida,
    f.cantidad,
    Number(f.precioSinIgv.toFixed(2)),
    Number(f.subtotalLinea.toFixed(2)),
    Number(f.igvLinea.toFixed(2)),
    Number(f.totalLinea.toFixed(2)),
    f.estado,
  ])

  const totalGeneral = filas.reduce((acc, f) => acc + f.totalLinea, 0)
  const unidadesGeneral = filas.reduce((acc, f) => acc + f.cantidad, 0)

  return (
    <div>
      <Link href="/consulta-ventas" className="text-sm font-bold text-[#64748b] dark:text-slate-400 hover:text-lime-600">
        ← Volver a Consulta de Ventas
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📦 Reporte de ventas por producto</h1>
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
            'Cantidad',
            'Precio unit. sin IGV',
            'Subtotal sin IGV',
            'IGV',
            'Total línea',
            'Estado',
          ]}
          filas={filasExcel}
          className="flex items-center gap-2 rounded-md bg-gradient-to-r from-lime-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-lime-500/30 transition-all active:scale-95"
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
          className="rounded-md bg-lime-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-lime-500/30 transition-all hover:bg-lime-700 active:scale-95"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5">
        <p className="border-b-2 border-[#f1f5f9] dark:border-slate-800 px-6 py-4 text-sm font-medium text-[#64748b] dark:text-slate-400">
          {filas.length} línea{filas.length === 1 ? '' : 's'} entre {desde} y {hasta} · {unidadesGeneral} unidades ·
          Total: S/ {totalGeneral.toFixed(2)}
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
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Producto</th>
                  <th className="px-5 py-3 font-bold">Unidad</th>
                  <th className="px-5 py-3 font-bold">Cant.</th>
                  <th className="px-5 py-3 font-bold">P. unit. sin IGV</th>
                  <th className="px-5 py-3 font-bold">Total línea</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] dark:border-slate-800 text-[#1e293b] dark:text-slate-100">
                    <td className="px-5 py-2.5 whitespace-nowrap text-[#64748b] dark:text-slate-400">{f.fecha}</td>
                    <td className="px-5 py-2.5">{f.tipo}</td>
                    <td className="px-5 py-2.5 font-semibold">{f.numero}</td>
                    <td className="px-5 py-2.5">{f.cliente}</td>
                    <td className="px-5 py-2.5">{f.producto}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">{f.unidadMedida}</td>
                    <td className="px-5 py-2.5">{f.cantidad}</td>
                    <td className="px-5 py-2.5 text-[#64748b] dark:text-slate-400">S/ {f.precioSinIgv.toFixed(2)}</td>
                    <td className={`px-5 py-2.5 font-semibold ${f.tipo === 'Nota de crédito' ? 'text-red-600' : ''}`}>
                      S/ {f.totalLinea.toFixed(2)}
                    </td>
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
