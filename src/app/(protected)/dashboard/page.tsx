import { createClient } from '@/lib/supabase/server'

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

  const { data: productos } = await supabase.from('productos').select('cantidad, costo')

  const { data: stockBajo } = await supabase
    .from('productos_stock_bajo')
    .select('id, nombre, cantidad, punto_reorden, unidad_nombre')
    .order('nombre')
    .returns<StockBajoRow[]>()

  const totalProductos = productos?.length ?? 0
  const valorInventario =
    productos?.reduce((acc, p) => acc + Number(p.cantidad) * Number(p.costo), 0) ?? 0
  const hayStockBajo = (stockBajo?.length ?? 0) > 0

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl shadow-indigo-500/20">
        <p className="text-sm font-medium text-indigo-100">¡Hola de nuevo!</p>
        <h1 className="mt-1 text-3xl font-extrabold">{perfil?.nombre}</h1>
        <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">
          {perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : ''}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-lg shadow-indigo-500/5 transition-transform hover:-translate-y-1">
          <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="flex items-center gap-4 p-7">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M20.25 7.5v9l-8.25 4.5m8.25-13.5-8.25-4.5-8.25 4.5m16.5 0-8.25 4.5m-8.25-4.5v9l8.25 4.5m-8.25-13.5 8.25 4.5m0 9v-9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Total de productos</p>
              <p className="mt-1 text-4xl font-extrabold text-[#1e293b]">{totalProductos}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border-2 border-emerald-100 bg-white shadow-lg shadow-emerald-500/5 transition-transform hover:-translate-y-1">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center gap-4 p-7">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4.5-5.25 4.5 4.5 4.5-4.5M7.5 8.25 12 3.75l4.5 4.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Valor del inventario</p>
              <p className="mt-1 text-4xl font-extrabold text-[#1e293b]">
                S/ {valorInventario.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-3xl border-2 bg-white shadow-lg transition-transform hover:-translate-y-1 ${
            hayStockBajo ? 'border-amber-100 shadow-amber-500/5' : 'border-slate-100 shadow-slate-500/5'
          }`}
        >
          <div className={`h-2 ${hayStockBajo ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-4 p-7">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
                hayStockBajo
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40'
                  : 'bg-slate-300 shadow-none'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Con stock bajo</p>
              <p className="mt-1 text-4xl font-extrabold text-[#1e293b]">{stockBajo?.length ?? 0}</p>
            </div>
          </div>
        </div>
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
