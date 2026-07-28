import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VentasComprasChart } from './ventas-compras-chart'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

type StockBajoRow = {
  id: number
  nombre: string
  cantidad: number
  punto_reorden: number | null
  unidad_nombre: string | null
}

const MESES_LABEL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function inicioDeMesISO() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function inicioMesesAtras(n: number) {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() - n)
  return d
}

function aFechaISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function clavesMes(fecha: Date) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}`
}

function clavesMesDeFecha(fechaISO: string) {
  // fecha_emision es tipo `date` ("YYYY-MM-DD") — parsear como fecha local, no UTC.
  const [anio, mes] = fechaISO.split('-').map(Number)
  return `${anio}-${mes - 1}`
}

function construirSeisMeses(
  ventasNetas: { neto: number; fecha_emision: string }[],
  compras: { total: number; creado_en: string }[] | null
) {
  const inicio = inicioMesesAtras(5)
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(inicio)
    fecha.setMonth(fecha.getMonth() + i)
    return { clave: clavesMes(fecha), mes: MESES_LABEL[fecha.getMonth()], ventas: 0, compras: 0 }
  })

  const indice = new Map(buckets.map((b) => [b.clave, b]))

  for (const v of ventasNetas) {
    const b = indice.get(clavesMesDeFecha(v.fecha_emision))
    if (b) b.ventas += v.neto
  }
  for (const c of compras ?? []) {
    const b = indice.get(clavesMes(new Date(c.creado_en)))
    if (b) b.compras += Number(c.total)
  }

  return buckets.map(({ clave: _clave, ...resto }) => resto)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = user
    ? await supabase
        .from('usuarios_perfil')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()
    : { data: null }

  const inicioMes = inicioDeMesISO()
  const inicioMesFecha = aFechaISO(new Date())
  const inicioSeisMeses = inicioMesesAtras(5).toISOString()
  const inicioSeisMesesFecha = aFechaISO(inicioMesesAtras(5))

  const [
    { data: productos },
    { data: stockBajo },
    { data: comprasMes },
    { count: cotizacionesMes },
    { count: ventasPendientes },
    { data: comprobantesSeisMeses },
    { data: comprasSeisMeses },
  ] = await Promise.all([
    supabase.from('productos').select('cantidad, costo'),
    supabase
      .from('productos_stock_bajo')
      .select('id, nombre, cantidad, punto_reorden, unidad_nombre')
      .order('nombre')
      .returns<StockBajoRow[]>(),
    supabase.from('ordenes_compra').select('total').eq('estado', 'recibida').gte('creado_en', inicioMes),
    supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).gte('creado_en', inicioMes),
    supabase.from('ordenes_venta').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase
      .from('comprobantes')
      .select('id, total, fecha_emision')
      .eq('estado', 'emitido')
      .gte('fecha_emision', inicioSeisMesesFecha),
    supabase.from('ordenes_compra').select('total, creado_en').eq('estado', 'recibida').gte('creado_en', inicioSeisMeses),
  ])

  const idsComprobantes = (comprobantesSeisMeses ?? []).map((c) => c.id)
  const [{ data: notasCredito }, { data: notasDebito }] = await Promise.all([
    idsComprobantes.length > 0
      ? supabase.from('notas_credito').select('comprobante_id, monto').in('comprobante_id', idsComprobantes)
      : Promise.resolve({ data: [] as { comprobante_id: number; monto: number }[] }),
    idsComprobantes.length > 0
      ? supabase.from('notas_debito').select('comprobante_id, monto').in('comprobante_id', idsComprobantes)
      : Promise.resolve({ data: [] as { comprobante_id: number; monto: number }[] }),
  ])

  const ajustePorComprobante = new Map<number, number>()
  for (const n of notasCredito ?? []) {
    ajustePorComprobante.set(n.comprobante_id, (ajustePorComprobante.get(n.comprobante_id) ?? 0) - Number(n.monto))
  }
  for (const n of notasDebito ?? []) {
    ajustePorComprobante.set(n.comprobante_id, (ajustePorComprobante.get(n.comprobante_id) ?? 0) + Number(n.monto))
  }

  const ventasNetasSeisMeses = (comprobantesSeisMeses ?? []).map((c) => ({
    neto: Math.max(0, Number(c.total) + (ajustePorComprobante.get(c.id) ?? 0)),
    fecha_emision: c.fecha_emision,
  }))

  const totalProductos = productos?.length ?? 0
  const valorInventario =
    productos?.reduce((acc, p) => acc + Number(p.cantidad) * Number(p.costo), 0) ?? 0
  const hayStockBajo = (stockBajo?.length ?? 0) > 0
  const totalVentasMes = ventasNetasSeisMeses
    .filter((v) => v.fecha_emision >= inicioMesFecha)
    .reduce((acc, v) => acc + v.neto, 0)
  const totalComprasMes = comprasMes?.reduce((acc, c) => acc + Number(c.total), 0) ?? 0
  const datosGrafico = construirSeisMeses(ventasNetasSeisMeses, comprasSeisMeses)

  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] p-7 text-white shadow-md">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-bold ring-1 ring-white/15">
              {(perfil?.nombre ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{perfil?.nombre}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-200 uppercase">
                  {perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : ''}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400 capitalize">{hoy}</p>
        </div>
      </div>

      <h2 className="mt-8 text-xs font-bold tracking-widest text-[#94a3b8] uppercase">Inventario</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M20.25 7.5v9l-8.25 4.5m8.25-13.5-8.25-4.5-8.25 4.5m16.5 0-8.25 4.5m-8.25-4.5v9l8.25 4.5m-8.25-13.5 8.25 4.5m0 9v-9" />
              </svg>
            </div>
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Total de productos</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-[#0f172a]">{totalProductos}</p>
        </div>

        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4.5-5.25 4.5 4.5 4.5-4.5M7.5 8.25 12 3.75l4.5 4.5" />
              </svg>
            </div>
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Valor del inventario</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-[#0f172a]">S/ {valorInventario.toFixed(2)}</p>
        </div>

        <div
          className={`rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
            hayStockBajo ? 'border-amber-200 hover:border-amber-300' : 'border-[#e5e9f0] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                hayStockBajo ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Con stock bajo</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-[#0f172a]">{stockBajo?.length ?? 0}</p>
        </div>
      </div>

      <h2 className="mt-8 text-xs font-bold tracking-widest text-[#94a3b8] uppercase">Este mes</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/ventas"
          className="rounded-2xl border border-[#e5e9f0] border-l-[3px] border-l-teal-500 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-base">💰</div>
          <p className="mt-3 text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Ventas facturadas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0f172a]">S/ {totalVentasMes.toFixed(2)}</p>
        </Link>

        <Link
          href="/compras"
          className="rounded-2xl border border-[#e5e9f0] border-l-[3px] border-l-pink-500 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-base">🛒</div>
          <p className="mt-3 text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Compras recibidas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0f172a]">S/ {totalComprasMes.toFixed(2)}</p>
        </Link>

        <Link
          href="/cotizaciones"
          className="rounded-2xl border border-[#e5e9f0] border-l-[3px] border-l-sky-500 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-base">📝</div>
          <p className="mt-3 text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Cotizaciones creadas</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0f172a]">{cotizacionesMes ?? 0}</p>
        </Link>

        <Link
          href="/ventas"
          className="rounded-2xl border border-[#e5e9f0] border-l-[3px] border-l-amber-500 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-base">⏳</div>
          <p className="mt-3 text-xs font-bold tracking-wide text-[#94a3b8] uppercase">Ventas por facturar</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0f172a]">{ventasPendientes ?? 0}</p>
        </Link>
      </div>

      <div className="mt-8">
        <VentasComprasChart datos={datosGrafico} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#e5e9f0] bg-white shadow-sm">
        <div className="border-b border-[#e5e9f0] px-7 py-5">
          <h2 className="text-base font-bold text-[#0f172a]">Productos con stock bajo</h2>
        </div>
        {!stockBajo || stockBajo.length === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-[#64748b]">
            🎉 Ningún producto está por debajo de su punto de reorden.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[#f1f5f9] text-[#64748b]">
                  <th className="px-7 py-3 font-bold">Producto</th>
                  <th className="px-7 py-3 font-bold">Cantidad</th>
                  <th className="px-7 py-3 font-bold">Unidad</th>
                  <th className="px-7 py-3 font-bold">Punto de reorden</th>
                </tr>
              </thead>
              <tbody>
                {stockBajo.map((p) => (
                  <tr key={p.id} className="border-b border-[#f1f5f9] text-[#1e293b] hover:bg-amber-50/50">
                    <td className="px-7 py-3 font-semibold">{p.nombre}</td>
                    <td className="px-7 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        {p.cantidad}
                      </span>
                    </td>
                    <td className="px-7 py-3 text-[#64748b]">{p.unidad_nombre ?? '—'}</td>
                    <td className="px-7 py-3 text-[#64748b]">{p.punto_reorden ?? '—'}</td>
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
