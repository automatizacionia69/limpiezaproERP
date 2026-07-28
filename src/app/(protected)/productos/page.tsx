import { createClient } from '@/lib/supabase/server'
import { ProductosTabla } from './productos-tabla'

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

  return <ProductosTabla productos={productos ?? []} />
}
