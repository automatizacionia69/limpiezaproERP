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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Total de productos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalProductos}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Valor del inventario</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            S/ {valorInventario.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Con stock bajo</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stockBajo?.length ?? 0}</p>
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
