import { createClient } from '@/lib/supabase/server'
import { ProductoForm } from './producto-form'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const [{ data: unidades }, { data: categorias }] = await Promise.all([
    supabase.from('unidades_medida').select('id, nombre').order('nombre'),
    supabase.from('categorias').select('id, nombre').order('nombre'),
  ])

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900">Agregar producto</h1>
      <ProductoForm unidades={unidades ?? []} categorias={categorias ?? []} />
    </div>
  )
}
