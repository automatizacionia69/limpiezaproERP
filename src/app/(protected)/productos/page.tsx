import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type ProductoRow = {
  id: number
  nombre: string
  codigo: string | null
  cantidad: number
  costo: number
  precio_venta: number | null
  punto_reorden: number | null
  categorias: { nombre: string } | null
  unidades_medida: { nombre: string } | null
}

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('productos')
    .select(
      'id, nombre, codigo, cantidad, costo, precio_venta, punto_reorden, categorias(nombre), unidades_medida(nombre)'
    )
    .order('nombre')
    .returns<ProductoRow[]>()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Productos</h1>
        <Link
          href="/productos/nuevo"
          className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Agregar producto
        </Link>
      </div>

      {!productos || productos.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          Todavía no hay productos.{' '}
          <Link href="/productos/nuevo" className="text-blue-700 underline">
            Agregar el primero
          </Link>
        </p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Código</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Unidad</th>
              <th className="py-2">Cantidad</th>
              <th className="py-2">Costo</th>
              <th className="py-2">Precio venta</th>
              <th className="py-2">Punto reorden</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 text-slate-800">
                <td className="py-2">{p.nombre}</td>
                <td className="py-2">{p.codigo ?? '—'}</td>
                <td className="py-2">{p.categorias?.nombre ?? '—'}</td>
                <td className="py-2">{p.unidades_medida?.nombre ?? '—'}</td>
                <td className="py-2">{p.cantidad}</td>
                <td className="py-2">{p.costo}</td>
                <td className="py-2">{p.precio_venta ?? '—'}</td>
                <td className="py-2">{p.punto_reorden ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
