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

function clavesMes(fecha: Date) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}`
}

function construirSeisMeses(
  ventas: { total: number; creado_en: string }[] | null,
  compras: { total: number; creado_en: string }[] | null
) {
  const inicio = inicioMesesAtras(5)
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(inicio)
    fecha.setMonth(fecha.getMonth() + i)
    return { clave: clavesMes(fecha), mes: MESES_LABEL[fecha.getMonth()], ventas: 0, compras: 0 }
  })

  const indice = new Map(buckets.map((b) => [b.clave, b]))

  for (const v of ventas ?? []) {
    const b = indice.get(clavesMes(new Date(v.creado_en)))
    if (b) b.ventas += Number(v.total)
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
  const inicioSeisMeses = inicioMesesAtras(5).toISOString()

  const [
    { data: productos },
    { data: stockBajo },
    { data: ventasMes },
    { data: comprasMes },
    { count: cotizacionesMes },
    { count: ventasPendientes },
    { data: ventasSeisMeses },
    { data: comprasSeisMeses },
  ] = await Promise.all([
    supabase.from('productos').select('cantidad, costo'),
    supabase
      .from('productos_stock_bajo')
      .select('id, nombre, cantidad, punto_reorden, unidad_nombre')
      .order('nombre')
      .returns<StockBajoRow[]>(),
    supabase.from('ordenes_venta').select('total').eq('estado', 'facturada').gte('creado_en', inicioMes),
    supabase.from('ordenes_compra').select('total').eq('estado', 'recibida').gte('creado_en', inicioMes),
    supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).gte('creado_en', inicioMes),
    supabase.from('ordenes_venta').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('ordenes_venta').select('total, creado_en').eq('estado', 'facturada').gte('creado_en', inicioSeisMeses),
    supabase.from('ordenes_compra').select('total, creado_en').eq('estado', 'recibida').gte('creado_en', inicioSeisMeses),
  ])

  const totalProductos = productos?.length ?? 0
  const valorInventario =
    productos?.reduce((acc, p) => acc + Number(p.cantidad) * Number(p.costo), 0) ?? 0
  const hayStockBajo = (stockBajo?.length ?? 0) > 0
  const totalVentasMes = ventasMes?.reduce((acc, v) => acc + Number(v.total), 0) ?? 0
  const totalComprasMes = comprasMes?.reduce((acc, c) => acc + Number(c.total), 0) ?? 0
  const datosGrafico = construirSeisMeses(ventasSeisMeses, comprasSeisMeses)

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-10 -right-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute top-64 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute top-[420px] right-10 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl shadow-indigo-500/30">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <p className="text-sm font-medium text-indigo-100">¡Hola de nuevo!</p>
        <h1 className="mt-1 text-3xl font-extrabold">{perfil?.nombre}</h1>
        <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">
          {perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : ''}
        </span>
      </div>

      <h2 className="mt-8 text-sm font-bold tracking-wide text-[#94a3b8] uppercase">Inventario</h2>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-7 text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/40">
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M20.25 7.5v9l-8.25 4.5m8.25-13.5-8.25-4.5-8.25 4.5m16.5 0-8.25 4.5m-8.25-4.5v9l8.25 4.5m-8.25-13.5 8.25 4.5m0 9v-9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-100">Total de productos</p>
              <p className="mt-1 text-4xl font-extrabold">{totalProductos}</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-7 text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/40">
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4.5-5.25 4.5 4.5 4.5-4.5M7.5 8.25 12 3.75l4.5 4.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-100">Valor del inventario</p>
              <p className="mt-1 text-4xl font-extrabold">S/ {valorInventario.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div
          className={`group relative overflow-hidden rounded-3xl p-7 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
            hayStockBajo
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 hover:shadow-amber-500/40'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/20 hover:shadow-slate-500/30'
          }`}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${hayStockBajo ? 'text-amber-100' : 'text-slate-200'}`}>
                Con stock bajo
              </p>
              <p className="mt-1 text-4xl font-extrabold">{stockBajo?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-bold tracking-wide text-[#94a3b8] uppercase">Este mes</h2>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/ventas"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-500/40"
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg backdrop-blur-sm">💰</div>
          <p className="relative mt-4 text-sm font-semibold text-teal-100">Ventas facturadas</p>
          <p className="relative mt-1 text-3xl font-extrabold">S/ {totalVentasMes.toFixed(2)}</p>
        </Link>

        <Link
          href="/compras"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg shadow-pink-500/30 transition-all hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/40"
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg backdrop-blur-sm">🛒</div>
          <p className="relative mt-4 text-sm font-semibold text-pink-100">Compras recibidas</p>
          <p className="relative mt-1 text-3xl font-extrabold">S/ {totalComprasMes.toFixed(2)}</p>
        </Link>

        <Link
          href="/cotizaciones"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 p-6 text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/40"
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg backdrop-blur-sm">📝</div>
          <p className="relative mt-4 text-sm font-semibold text-sky-100">Cotizaciones creadas</p>
          <p className="relative mt-1 text-3xl font-extrabold">{cotizacionesMes ?? 0}</p>
        </Link>

        <Link
          href="/ventas"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40"
        >
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-125" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg backdrop-blur-sm">⏳</div>
          <p className="relative mt-4 text-sm font-semibold text-amber-100">Ventas por facturar</p>
          <p className="relative mt-1 text-3xl font-extrabold">{ventasPendientes ?? 0}</p>
        </Link>
      </div>

      <div className="mt-8">
        <VentasComprasChart datos={datosGrafico} />
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border-2 border-[#e2e8f0] bg-white shadow-lg shadow-slate-500/5">
        <div className="border-b-2 border-[#f1f5f9] px-7 py-5">
          <h2 className="text-lg font-extrabold text-[#1e293b]">⚠️ Productos con stock bajo</h2>
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
