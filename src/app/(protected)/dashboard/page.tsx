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

  return (
    <div>
      <div className="text-center">
        <p className="text-sm text-slate-500">Hola,</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{perfil?.nombre}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Rol: {perfil ? (ROLE_LABELS[perfil.rol] ?? perfil.rol) : ''}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-blue-600" />
          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M20.25 7.5v9l-8.25 4.5m8.25-13.5-8.25-4.5-8.25 4.5m16.5 0-8.25 4.5m-8.25-4.5v9l8.25 4.5m-8.25-13.5 8.25 4.5m0 9v-9" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de productos</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{totalProductos}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-600" />
          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4.5-5.25 4.5 4.5 4.5-4.5M7.5 8.25 12 3.75l4.5 4.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Valor del inventario</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                S/ {valorInventario.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={`h-1.5 ${(stockBajo?.length ?? 0) > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-4 p-6">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                (stockBajo?.length ?? 0) > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Con stock bajo</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{stockBajo?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Productos con stock bajo</h2>
        {!stockBajo || stockBajo.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Ningún producto está por debajo de su punto de reorden.
          </p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Producto</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2">Unidad</th>
                <th className="py-2">Punto de reorden</th>
              </tr>
            </thead>
            <tbody>
              {stockBajo.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 text-slate-800">
                  <td className="py-2">{p.nombre}</td>
                  <td className="py-2">{p.cantidad}</td>
                  <td className="py-2">{p.unidad_nombre ?? '—'}</td>
                  <td className="py-2">{p.punto_reorden ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
